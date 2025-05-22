use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, HOT_KEY_MODIFIERS, MOD_ALT};

/*
    A safe wrapper around the unsafe RegisterHotKey Win32 function.

    https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/UI/Input/KeyboardAndMouse/fn.RegisterHotKey.html
    https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey
*/
pub fn register_hotkey() -> std::result::Result<(), String> {
    let r = unsafe { RegisterHotKey(None, 1, MOD_ALT, 42) };    // ALT + b

    Ok(())
}

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
