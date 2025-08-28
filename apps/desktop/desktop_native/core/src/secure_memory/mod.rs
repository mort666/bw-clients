#[cfg(target_os = "windows")]
pub(crate) mod dpapi;
#[cfg(target_os = "linux")]
mod unimplemented;
#[cfg(target_os = "macos")]
mod unimplemented;

/// The secure memory store provides an ephemeral key-value store for sensitive data.
/// Data stored in this store is prevented from being swapped to disk and zeroed out. Additionally,
/// platform-specific protections are applied to prevent memory dumps or debugger access from
/// reading the stored values.
pub(crate) trait SecureMemoryStore {
    /// Stores a copy of the provided value in secure memory.
    fn put(&mut self, key: String, value: &[u8]);
    /// Retrieves a copy of the value associated with the given key from secure memory.
    /// This copy does not have additional memory protections applied, and should be zeroed when no
    /// longer needed.
    fn get(&self, key: &str) -> Option<Vec<u8>>;
    /// Checks if a value is stored under the given key.
    fn has(&self, key: &str) -> bool;
    /// Removes the value associated with the given key from secure memory.
    fn remove(&mut self, key: &str);
    /// Clears all values stored in secure memory.
    fn clear(&mut self);
}

/// Creates a new secure memory store based on the platform.
pub fn create_secure_memory_store() -> Box<dyn SecureMemoryStore> {
    #[cfg(target_os = "linux")]
    {
        unimplemented!()
    }
    #[cfg(target_os = "windows")]
    {
        Box::new(dpapi::DpapiSecretKVStore::new())
    }
    #[cfg(target_os = "macos")]
    {
        unimplemented!()
    }
}