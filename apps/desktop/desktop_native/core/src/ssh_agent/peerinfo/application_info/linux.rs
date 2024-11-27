use super::ApplicationInfo;
use base64::{prelude::BASE64_STANDARD, Engine};
use sysinfo::{Pid, System};

pub fn get_info(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    println!("[PeerInfo] Getting info for pid: {}", pid);
    let s = System::new_all();
    let scope = std::fs::read_to_string(format!("/proc/{}/cgroup", pid))?;
    let process_name = s
        .process(Pid::from(pid))
        .ok_or(anyhow::anyhow!("Pid not found"))?
        .name();

    println!("[PeerInfo] Checking if is flatpak");
    if let Ok(appinfo) = flatpak_parser(scope.clone()) {
        println!("[PeerInfo] Is flatpak");
        return Ok(appinfo)
    }

    println!("[PeerInfo] Checking if is snap");
    if let Ok(appinfo) = snap_parser(scope.clone()) {
        println!("[PeerInfo] Is snap");
        return Ok(appinfo)
    }

    println!("[PeerInfo] Checking if is gnome app");
    if let Ok(appinfo) = gnome_app_parser(scope) {
        println!("[PeerInfo] Is gnome app");
        return Ok(appinfo)
    }

    println!("[PeerInfo] Is not a recognized app");
    return Ok(ApplicationInfo {
        name: process_name
            .to_str()
            .ok_or(anyhow::anyhow!("Could not make path into string"))?
            .to_string(),
        path: None,
        icon: None,
        is_installed_app: false,
    });
}

fn gnome_app_parser(scope: String) -> Result<ApplicationInfo, anyhow::Error> {
    let part = scope.split("/").find(|s| s.starts_with("app-gnome")).ok_or(anyhow::anyhow!("No gnome app found"))?;
    let app_id = part.split('-').nth(2).ok_or(anyhow::anyhow!("No app id found"))?;
    let desktop_file = parse_desktop_file(format!("/usr/share/applications/{}.desktop", app_id).as_str())?;
    let icon = find_unsandboxed_icon(&desktop_file.icon_name);
    return Ok(ApplicationInfo {
        name: desktop_file.name,
        path: None,
        icon,
        is_installed_app: true,
    });
}

fn flatpak_parser(scope: String) -> Result<ApplicationInfo, anyhow::Error> {
    let part = scope.split("/").find(|s| s.starts_with("app-flatpak"));
    if let Some(scope) = part {
        let app_id = scope
            .split('-')
            .nth(2)
            .ok_or(anyhow::anyhow!("No app id found"))?;
        let desktop_file = std::fs::read_to_string(format!(
            "/var/lib/flatpak/app/{}/current/active/export/share/applications/{}.desktop",
            app_id, app_id
        ))?;
        let name = desktop_file
            .lines()
            .find(|line| line.starts_with("Name="))
            .ok_or(anyhow::anyhow!("No name found"))?
            .split('=')
            .last()
            .ok_or(anyhow::anyhow!("No name found"))?;
        let path = format!(
            "/var/lib/flatpak/app/{}/current/active/export/share/icons/hicolor/",
            app_id
        );
        let scalable = read_icon(&format!("{}/scalable/apps/{}.svg", path, app_id));
        if let Some(icon) = scalable {
            return Ok(ApplicationInfo {
                name: name.to_string(),
                path: Some(path),
                icon: Some(icon),
                is_installed_app: true,
            });
        } else {
            for size in vec![512, 256, 128, 64] {
                let icon = read_icon(&format!("{}/{}x{}/apps/{}.png", path, size, size, app_id));
                if let Some(icon) = icon {
                    return Ok(ApplicationInfo {
                        name: name.to_string(),
                        path: Some(path),
                        icon: Some(icon),
                        is_installed_app: true,
                    });
                }
            }
        }
    }

    return Err(anyhow::anyhow!("Not a flatpak app"));
}

fn snap_parser(scope: String) -> Result<ApplicationInfo, anyhow::Error> {
    let part = scope.split("/").find(|s| s.starts_with("snap."));
    if let Some(scope) = part {
        let app_id = scope
            .split('.')
            .nth(1)
            .ok_or(anyhow::anyhow!("Failed to parse snap appid"))?;

        let desktop_file = parse_desktop_file(format!("/var/lib/snapd/desktop/applications/{}_{}.desktop", app_id, app_id).as_str())?;
        let name = desktop_file.name;
        let icon = read_icon(&desktop_file.icon_name);
        let icon = if let Some(icon) = icon {
            Some(icon)
        } else {
            None
        };

        return Ok(ApplicationInfo {
            name: name.to_string(),
            path: None,
            icon,
            is_installed_app: true,
        });
    }

    return Err(anyhow::anyhow!("Not a snap app"));
}

fn find_unsandboxed_icon(app_name: &str) -> Option<String> {
    let scalable = read_icon(&format!("/usr/share/icons/hicolor/scalable/apps/{}.svg", app_name));
    if let Some(scalable) = scalable {
        println!("[PeerInfo] Found scalable icon: {}", scalable);
        return Some(scalable);
    }

    let paths = vec![
        "/usr/share/icons/hicolor/512x512/apps",
        "/usr/share/icons/hicolor/256x256/apps",
        "/usr/share/icons/hicolor/128x128/apps",
        "/usr/share/icons/hicolor/64x64/apps",
        "/usr/share/pixmaps",
    ];
    for path in paths {
        println!("[PeerInfo] Chceking path for icon: {}", path);
        if let Some(icon) = read_icon(&format!("{}/{}.png", path, app_name)) {
            println!("[PeerInfo] Found icon: {}", icon);
            return Some(icon);
        }
    }
    println!("[PeerInfo] Icon not found");
    None
}

fn read_icon(path: &str) -> Option<String> {
    // ends with .svg
    if path.ends_with(".svg") {
        let icon = std::fs::read(path);
        if icon.is_ok() {
            return Some("data:image/svg+xml;base64,".to_string() + &BASE64_STANDARD.encode(icon.unwrap()));
        }
    } else if path.ends_with(".png") {
        let icon = std::fs::read(path);
        if icon.is_ok() {
            return Some("data:image/png;base64,".to_string() + &BASE64_STANDARD.encode(icon.unwrap()));
        }
    }
    None
}

#[derive(Debug)]
struct DesktopFile {
    name: String,
    icon_name: String,
}

fn parse_desktop_file(path: &str) -> Result<DesktopFile, anyhow::Error> {
    let desktop_file = std::fs::read_to_string(path).unwrap();
    let name = desktop_file
        .lines()
        .find(|line| line.starts_with("Name="))
        .ok_or(anyhow::anyhow!("Name not found"))?
        .split('=')
        .nth(1)
        .ok_or(anyhow::anyhow!("Name not found"))?;
    let icon = desktop_file
        .lines()
        .find(|line| line.starts_with("Icon="))
        .ok_or(anyhow::anyhow!("Icon not found"))?
        .split('=')
        .nth(1)
        .ok_or(anyhow::anyhow!("Icon not found"))?;

    return Ok(DesktopFile {
        name: name.to_string(),
        icon_name: icon.to_string(),
    });
}
