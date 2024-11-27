use base64::prelude::BASE64_STANDARD;
use icns::{IconFamily, IconType};
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

        println!("checking parent: {:?} {:?}", ppid, proc.unwrap().name());

        let parent_info = get_info_for_pid(ppid.as_u32() as usize)?;
        if parent_info.is_installed_app {
            println!("Parent app installed, returning parent app");
            return Ok(parent_info);
        }

        if let Ok(new_ppid) = get_parent_pid(ppid) {
            println!("Found parent using sysinfo");
            ppid = new_ppid;
        } else {
            if let Ok(new_ppid) = get_parent_fallback(ppid) {
                println!("Found parent using fallback");
                ppid = new_ppid;
            } else {
                break;
            }
        }
    }

    println!("No app found, returning initial app");
    Ok(app_info)
}

fn get_info_for_pid(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    let sys = System::new_all();
    // get with pid
    let proc = sys.process(Pid::from(pid));
    let executable_path = proc.unwrap().exe().ok_or(anyhow::anyhow!("Executable path not found"))?.to_str().unwrap().to_string();
    let process_name = proc.ok_or(anyhow::anyhow!("Process not found"))?.name();

    println!("executable_path: {:?}", executable_path);

    // if path stars with /Applications/
    if executable_path.starts_with("/Applications/") {
        let application_name = executable_path.split("/").last().ok_or(anyhow::anyhow!("App name not found"))?;
        let package_name = executable_path.split("/").nth(2).ok_or(anyhow::anyhow!("Package name not found"))?;

        return Ok(ApplicationInfo {
            name: application_name.to_string(),
            path: Some(executable_path.clone()),
            icon: get_icon(package_name).ok(),
            is_installed_app: true,
        });
    } else {
        return Ok(ApplicationInfo {
            name: process_name.to_str().unwrap().to_string(),
            path: None,
            icon: None,
            is_installed_app: false,
        });
    }
}

fn get_icon(package_name: &str) -> Result<String, anyhow::Error> {
    let icon_path = format!("/Applications/{}/Contents/Resources/AppIcon.icns", package_name);
    let file = BufReader::new(File::open(icon_path)?);
    let icon_family = IconFamily::read(file)?;       
    let image = icon_family.get_icon_with_type(IconType::RGBA32_128x128)?;
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