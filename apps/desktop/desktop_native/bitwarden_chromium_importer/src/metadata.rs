use serde::Serialize;
use std::collections::{HashMap, HashSet};

use crate::PLATFORM_SUPPORTED_BROWSERS;

#[derive(Serialize)]
/// Mechanisms that load data into the importer
pub struct ImporterMetadata {
    /// Identifies the importer
    pub id: String,
    /// Describes the strategies used to obtain imported data
    pub loaders: Vec<&'static str>,
    /// Identifies the instructions for the importer
    pub instructions: &'static str,
}

/// Returns a map of supported importers based on the current platform.
///
/// Only browsers listed in PLATFORM_SUPPORTED_BROWSERS will have the "chromium" loader.
/// All importers will have the "file" loader.
pub fn get_supported_importers() -> HashMap<String, ImporterMetadata> {
    let mut map = HashMap::new();

    const IMPORTERS: [(&str, &str); 6] = [
        ("chromecsv", "Chrome"),
        ("chromiumcsv", "Chromium"),
        ("bravecsv", "Brave"),
        ("operacsv", "Opera"),
        ("vivaldicsv", "Vivaldi"),
        ("edgecsv", "Microsoft Edge"),
    ];

    let supported: HashSet<&'static str> =
        PLATFORM_SUPPORTED_BROWSERS.iter().map(|b| b.name).collect();

    for (id, browser_name) in IMPORTERS {
        let mut loaders: Vec<&'static str> = vec!["file"];
        if supported.contains(browser_name) {
            loaders.push("chromium");
        }

        map.insert(
            id.to_string(),
            ImporterMetadata {
                id: id.to_string(),
                loaders,
                instructions: "chromium",
            },
        );
    }

    map
}
