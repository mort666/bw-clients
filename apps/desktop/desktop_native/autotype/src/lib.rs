#![cfg(target_os = "windows")]

use anyhow::Result;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows::Win32::Foundation::{HWND, LPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_RETURN, VK_TAB,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetForegroundWindow, GetWindowTextW, IsWindowVisible, SetForegroundWindow, ShowWindow, SW_NORMAL,
};
use windows_core::BOOL;

#[derive(Debug, Clone)]
pub struct WindowInfo {
    pub handle: isize,
    pub title: String,
}

pub fn get_active_windows() -> Result<Vec<WindowInfo>> {
    extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        unsafe {
            if IsWindowVisible(hwnd).as_bool() {
                let mut buf = [0u16; 512];
                let len = GetWindowTextW(hwnd, &mut buf);
                if len > 0 {
                    let title = OsString::from_wide(&buf[..len as usize])
                        .to_string_lossy()
                        .into_owned();
                    let windows = &mut *(lparam.0 as *mut Vec<WindowInfo>);
                    windows.push(WindowInfo {
                        handle: hwnd.0 as isize,
                        title,
                    });
                }
            }
        }
        true.into()
    }

    let mut windows: Vec<WindowInfo> = Vec::new();
    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut windows as *mut _ as isize),
        );
    }
    Ok(windows)
}

pub fn set_window_foreground(handle: isize) -> Result<()> {
    unsafe {
        let hwnd = HWND(handle as *mut std::ffi::c_void);
        let _ = ShowWindow(hwnd, SW_NORMAL);
        if !SetForegroundWindow(hwnd).as_bool() {
            anyhow::bail!("Failed to set window foreground");
        }
    }
    Ok(())
}

const DELAY_MS: u64 = 25; // Delay between keystrokes
const DELAY_MS_STEPS: u64 = 200; // Delay between steps

fn send_virtual_key(vk: VIRTUAL_KEY, press: bool) -> Result<()> {
    let mut input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if !press {
                    KEYEVENTF_KEYUP
                } else {
                    Default::default()
                },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
    Ok(())
}

fn send_unicode_char(c: char) -> Result<()> {
    let mut input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: windows::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(0),
                wScan: c as u16,
                dwFlags: windows::Win32::UI::Input::KeyboardAndMouse::KEYEVENTF_UNICODE,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
    std::thread::sleep(std::time::Duration::from_millis(DELAY_MS));
    Ok(())
}

pub fn perform_autotype(username: &str, password: &str, send_enter: bool) -> Result<()> {
    // Type username
    for c in username.chars() {
        send_unicode_char(c)?;
    }
    
    std::thread::sleep(std::time::Duration::from_millis(DELAY_MS_STEPS));

    // Press TAB
    send_virtual_key(VK_TAB, true)?;
    send_virtual_key(VK_TAB, false)?;
    std::thread::sleep(std::time::Duration::from_millis(DELAY_MS));

    std::thread::sleep(std::time::Duration::from_millis(DELAY_MS_STEPS));

    // Type password
    for c in password.chars() {
        send_unicode_char(c)?;
    }
    
    std::thread::sleep(std::time::Duration::from_millis(DELAY_MS_STEPS));

    // Optionally press Enter
    if send_enter {
        send_virtual_key(VK_RETURN, true)?;
        send_virtual_key(VK_RETURN, false)?;
    }

    Ok(())
}

pub fn get_focused_window() -> Result<WindowInfo> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            anyhow::bail!("No foreground window found");
        }

        let mut buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buf);
        if len == 0 {
            anyhow::bail!("Failed to get window title");
        }

        let title = OsString::from_wide(&buf[..len as usize])
            .to_string_lossy()
            .into_owned();

        Ok(WindowInfo {
            handle: hwnd.0 as isize,
            title,
        })
    }
}
