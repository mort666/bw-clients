use apple_bundle::plist;
use base64::prelude::BASE64_STANDARD;
use icns::{IconFamily, IconType};
use serde::{Deserialize, Serialize};
use sysinfo::{Pid, System};
use std::{fs::File, io::{BufReader, BufWriter}, process::Command};
use base64::prelude::*;

use super::ApplicationInfo;

pub fn get_info(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    let pid = pid;
    let app_info = get_info_for_pid(pid)?;
    if app_info.is_installed_app {
        println!("Initial app installed, returning early");
        return Ok(app_info);
    }

    let mut ppid = get_parent_pid(Pid::from(pid))?;
    for _ in 0..10 {
        let sys = System::new_all();
        let proc = sys.process(ppid);
        if proc.is_none() {
            break;
        }
        let parent_info = get_info_for_pid(ppid.as_u32() as usize)?;
        if parent_info.is_installed_app {
            return Ok(parent_info);
        }

        ppid = get_parent(ppid)?;
    }

    println!("No app found, returning initial app");
    Ok(app_info)
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq, Default)]
pub struct InfoPlist {
    #[serde(
        rename = "CFBundleName",
        skip_serializing_if = "Option::is_none"
    )]
    pub bundle_name: Option<String>,
    #[serde(
        rename = "CFBundleDisplayName",
        skip_serializing_if = "Option::is_none"
    )]
    pub bundle_display_name: Option<String>,
    #[serde(
        rename = "CFBundleIconFile",
        skip_serializing_if = "Option::is_none"
    )]
    pub bundle_icon_file: Option<String>,
}

fn get_info_for_pid(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    let sys = System::new_all();
    // get with pid
    let proc = sys.process(Pid::from(pid));
    let executable_path = proc.unwrap().exe().ok_or(anyhow::anyhow!("Executable path not found"))?.to_str().unwrap().to_string();
    let process_name = proc.ok_or(anyhow::anyhow!("Process not found"))?.name();

    // if path stars with /Applications/
    if executable_path.starts_with("/Applications/") {
        let application_name = executable_path.split("/").last().ok_or(anyhow::anyhow!("App name not found"))?;
        let package_name = executable_path.split("/").nth(2).ok_or(anyhow::anyhow!("Package name not found"))?;
        let info_plist_path = format!("/Applications/{}/Contents/Info.plist", package_name);
        let info_plist = std::fs::read(info_plist_path).map_err(|e| anyhow::anyhow!("Error reading Info.plist: {:?}", e))?;
        let info_plist: InfoPlist = plist::from_bytes(&info_plist).map_err(|e| anyhow::anyhow!("Error parsing Info.plist: {:?}", e))?;
        let application_name = info_plist.bundle_display_name.unwrap_or(application_name.to_string());
        let icon_name = info_plist.bundle_icon_file.unwrap_or("AppIcon.icns".to_string());
        let icon_name = if icon_name.ends_with(".icns") {
            icon_name
        } else {
            format!("{}.icns", icon_name)
        };
        let icon = get_icon(package_name, &icon_name).ok();
        return Ok(ApplicationInfo {
            name: application_name,
            path: Some(executable_path.clone()),
            icon,
            is_installed_app: true,
        });
    } else {
        return Ok(ApplicationInfo {
            name: process_name.to_str().unwrap_or_else(|| "unknown process").to_string(),
            path: None,
            icon: None,
            is_installed_app: false,
        });
    }
}

fn get_icon(package_name: &str, icon_name: &str) -> Result<String, anyhow::Error> {
    let icon_path = format!("/Applications/{}/Contents/Resources/{}", package_name, icon_name);
    let file = BufReader::new(File::open(icon_path)?);
    let icon_family = IconFamily::read(file)?;       
    let image = icon_family.get_icon_with_type(IconType::RGBA32_128x128).unwrap();
    let mut buffer = Vec::new();
    let file = BufWriter::new(&mut buffer);
    image.write_png(file)?;
    let base64 = BASE64_STANDARD.encode(&buffer);
    Ok("data:image/png;base64,".to_string() + &base64)
}

fn get_parent_pid(pid: Pid) -> Result<Pid, anyhow::Error> {
    let sys = System::new_all();
    let proc = sys.process(pid);
    let parent = proc.ok_or(anyhow::anyhow!("Process not found"))?.parent().ok_or(anyhow::anyhow!("Parent not found"))?;
    Ok(parent)
}

/// For some processes (login process spawned by iTerm), we can't get the parent process using sysinfo, so we fall back to ps
fn get_parent_fallback(pid: Pid) -> Result<Pid, anyhow::Error> {
    let output = Command::new("ps")
        .arg("-o")
        .arg("ppid")
        .arg("-f")
        .arg(pid.to_string())
        .output()
        .expect("failed to execute process");
    let output = String::from_utf8(output.stdout)?;
    let parent_pid = output.lines().nth(1).ok_or(anyhow::anyhow!("Line not found"))?.split_whitespace().nth(0).ok_or(anyhow::anyhow!("Column not found"))?;
    let parent_pid = parent_pid.parse::<usize>()?;
    Ok(Pid::from(parent_pid))
}

fn get_parent(pid: Pid) -> Result<Pid, anyhow::Error> {
    get_parent_pid(pid).or_else(|_| get_parent_fallback(pid))
}