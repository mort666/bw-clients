use std::panic;

use super::ApplicationInfo;
use sysinfo::{Pid, System};
use windows_icons::get_icon_base64_by_process_id;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM};

pub fn get_info(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    let mut pid = pid;
    println!("Getting info for pid: {}", pid);
    for _ in 0..8 {
        let process_name = get_pid_process_name(pid as u32);
        println!("Process name: {}", process_name);

        if is_pid_with_window(pid as u32) {
            print!("Pid with window: {}", pid);
            return get_info_for(pid);
        }
        println!("Pid without window: {}", pid);
        pid = get_parent_pid(Pid::from_u32(pid as u32))?.as_u32() as usize;
    }

    let processes = System::new_all();
    let process = processes.process(Pid::from_u32(pid as u32));
    let application_name = process.map(|p| p.name().to_str()).unwrap_or(Some("Unknown application")).unwrap_or("Unknown application");
    return Ok(ApplicationInfo{
        name: application_name.to_string(),
        path: None,
        icon: None,
        is_installed_app: false
    })
}

fn get_info_for(pid: usize) -> Result<ApplicationInfo, anyhow::Error> {
    let sys = System::new_all();
    let proc = sys.process(Pid::from_u32(pid as u32));
    let executable_path = proc.unwrap().exe().ok_or(anyhow::anyhow!("Executable path not found"))?.to_str().unwrap().to_string();
    let icon = panic::catch_unwind(|| {
        get_icon_base64_by_process_id(pid as u32)
    });
    let icon = match icon {
        Ok(icon) => icon,
        Err(_) => {
            return Ok(ApplicationInfo{
                name: "Unknown application".to_string(),
                path: None,
                icon: None,
                is_installed_app: false
            })
        }
    };

    let icon = "data:image/png;base64,".to_string() + &icon;

    let processes = System::new_all();
    let process = processes.process(Pid::from_u32(pid as u32));
    let application_name = process.map(|p| p.name().to_str()).unwrap_or(Some("Unknown application")).unwrap_or("Unknown application");
    return Ok(ApplicationInfo{
        name: application_name.to_string(),
        path: Some(executable_path),
        icon: Some(icon),
        is_installed_app: false
    })
}

fn is_pid_with_window(pid: u32) -> bool {
    unsafe {
        windows::Win32::UI::WindowsAndMessaging::EnumWindows(Some(enum_proc), LPARAM(0)).unwrap();
        let contains_pid = RESULT.contains(&pid);
        RESULT.clear();
        contains_pid
    }
}

fn get_parent_pid(pid: Pid) -> Result<Pid, anyhow::Error> {
    let sys = System::new_all();
    let proc = sys.process(pid);
    let parent = proc.ok_or(anyhow::anyhow!("Process not found"))?.parent().ok_or(anyhow::anyhow!("Parent not found"))?;
    Ok(parent)
}


type ForEachCallback<'a> = Box<dyn FnMut(HWND) + 'a>;

static mut RESULT: Vec<u32> = Vec::new();

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let mut title = [0u16; 1024];
    let len = windows::Win32::UI::WindowsAndMessaging::GetWindowTextLengthW(hwnd);
    if len == 0 {
        return true.into();
    } else if (len as usize) >= title.len() {
        return true.into();
    }
    windows::Win32::UI::WindowsAndMessaging::GetWindowTextW(hwnd, &mut title);
    let mut pid = 0;
    let _ = windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId(hwnd, Some(&mut pid));
    RESULT.push(pid);

    if let Some(boxed) = (lparam.0 as *mut ForEachCallback).as_mut() {
        (*boxed)(hwnd);
    }
    true.into()
}


fn get_pid_process_name(pid: u32) -> String {
    let sys = System::new_all();
    let proc = sys.process(Pid::from_u32(pid));
    let process_name = proc.ok_or(anyhow::anyhow!("Process not found"));
    match process_name {
        Ok(process_name) => process_name.name().to_str().unwrap().to_string(),
        Err(_) => "Unknown process".to_string()
    }
}