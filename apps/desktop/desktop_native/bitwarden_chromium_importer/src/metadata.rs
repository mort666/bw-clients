use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct ImporterMetadata {
    pub id: String,
    pub loaders: Vec<&'static str>,
    pub instructions: &'static str,
}

#[cfg(target_os = "windows")]
fn chrome_loaders() -> Vec<&'static str> {
    vec!["file"]
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn chrome_loaders() -> Vec<&'static str> {
    vec!["file", "chromium"]
}

#[cfg(target_os = "windows")]
fn brave_loaders() -> Vec<&'static str> {
    vec!["file"]
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn brave_loaders() -> Vec<&'static str> {
    vec!["file", "chromium"]
}

pub fn get_supported_importers() -> HashMap<String, ImporterMetadata> {
    let mut map = HashMap::new();

    // force chrome to use target_os dependent loaders
    map.insert(
        "chromecsv".to_string(),
        ImporterMetadata {
            id: "chromecsv".to_string(),
            loaders: chrome_loaders(),
            instructions: "chromium",
        },
    );
    // force brave to use target_os dependent loaders
    map.insert(
        "bravecsv".to_string(),
        ImporterMetadata {
            id: "bravecsv".to_string(),
            loaders: brave_loaders(),
            instructions: "chromium",
        },
    );

    // all other chromium based browsers support file & chromium loaders on all platforms
    for id in ["operacsv", "vivaldicsv", "edgecsv"] {
        map.insert(
            id.to_string(),
            ImporterMetadata {
                id: id.to_string(),
                loaders: vec!["file", "chromium"],
                instructions: "chromium",
            },
        );
    }

    map
}
