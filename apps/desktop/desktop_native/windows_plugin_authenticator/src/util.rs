use serde_json::json;
use windows::Win32::Foundation::*;
use windows::Win32::System::LibraryLoader::*;
use windows_core::*;

pub unsafe fn delay_load<T>(library: PCSTR, function: PCSTR) -> Option<T> {
    let library = LoadLibraryExA(library, None, LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);

    let Ok(library) = library else {
        return None;
    };

    let address = GetProcAddress(library, function);

    if address.is_some() {
        return Some(std::mem::transmute_copy(&address));
    }

    _ = FreeLibrary(library);

    None
}

pub trait WindowsString {
    fn into_win_utf8(self: Self) -> (*mut u8, u32);
    fn into_win_utf16(self: Self) -> (*mut u16, u32);
}

impl WindowsString for String {
    fn into_win_utf8(self: Self) -> (*mut u8, u32) {
        let mut v = self.into_bytes();
        v.push(0);

        (v.as_mut_ptr(), v.len() as u32)
    }

    fn into_win_utf16(self: Self) -> (*mut u16, u32) {
        let mut v: Vec<u16> = self.encode_utf16().collect();
        v.push(0);

        (v.as_mut_ptr(), v.len() as u32)
    }
}

pub fn message(message: String) {
    let json_data = json!({
        "message": message,
    });

    let request = reqwest::blocking::Client::new();
    let _ = request
        .post("http://127.0.0.1:3000/message")
        .json(&json_data)
        .send();
}
