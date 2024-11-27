use super::ApplicationInfo;
use base64::{prelude::BASE64_STANDARD, Engine};
use sysinfo::{Pid, System};

pub fn get_info(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    let s = System::new_all();
    let file = std::fs::read_to_string(format!("/proc/{}/cgroup", pid))?;
    let process_name = s
        .process(Pid::from(pid))
        .ok_or(anyhow::anyhow!("Pid not found"))?
        .name();
    println!("process name {:?}", process_name);

    let scope = file
        .split('/')
        .last()
        .ok_or(anyhow::anyhow!("No scope found"))?
        .replace(".scope", "");
    println!("scope {:?}", scope);

    if scope.starts_with("app-flatpak") {
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
        let scalable = try_read_icon(&format!("{}/scalable/apps/{}.svg", path, app_id));
        if scalable.is_some() {
            let base64 = BASE64_STANDARD.encode(scalable.unwrap());

            return Ok(ApplicationInfo {
                name: name.to_string(),
                path: Some(path),
                icon: Some(format!("data:image/svg+xml;base64,{}", base64)),
                is_installed_app: true,
            });
        } else {
            for size in vec![512, 256, 128, 64] {
                let icon =
                    try_read_icon(&format!("{}/{}x{}/apps/{}.png", path, size, size, app_id));
                if icon.is_some() {
                    return Ok(ApplicationInfo {
                        name: name.to_string(),
                        path: Some(path),
                        icon: Some(format!(
                            "data:image/png;base64,{}",
                            BASE64_STANDARD.encode(icon.unwrap())
                        )),
                        is_installed_app: true,
                    });
                }
            }
        }
    }

    if scope.starts_with("snap.") {
        let app_id = scope
            .split('.')
            .nth(1)
            .ok_or(anyhow::anyhow!("Failed to parse snap appid"))?;
        let desktop_file = std::fs::read_to_string(format!(
            "/var/lib/snapd/desktop/applications/{}_{}.desktop",
            app_id, app_id
        ))?;
        let name = desktop_file
            .lines()
            .find(|line| line.starts_with("Name="))
            .ok_or(anyhow::anyhow!(
                "Name of application in desktop file not found"
            ))?
            .split('=')
            .last()
            .ok_or(anyhow::anyhow!(
                "Failed to parse desktop file application name"
            ))?;

        return Ok(ApplicationInfo {
            name: name.to_string(),
            path: None,
            icon: None,
            is_installed_app: true,
        });
    }

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
fn try_read_icon(path: &str) -> Option<Vec<u8>> {
    let icon = std::fs::read(path);
    if icon.is_ok() {
        return Some(icon.unwrap());
    }
    None
}
