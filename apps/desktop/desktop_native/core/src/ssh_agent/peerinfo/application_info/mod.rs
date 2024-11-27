#[cfg_attr(target_os = "linux", path = "unix.rs")]
#[cfg_attr(target_os = "windows", path = "windows.rs")]
#[cfg_attr(target_os = "macos", path = "macos.rs")]
mod application_info;
pub use application_info::*;

#[derive(Debug, Clone)]
pub struct ApplicationInfo {
    /// Name of the application
    pub name: String,
    /// Installation path
    pub path: Option<String>,
    /// Icon encoded in b64 as either svg or png
    pub icon: Option<String>,
    /// Whether this is a properly installed app
    pub is_installed_app: bool,
}
