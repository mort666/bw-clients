use crate::secure_memory::SecureMemoryStore;

pub struct UnimplementedKVStore {}

impl UnimplementedKVStore {
    pub(super) fn new() -> Self {
        UnimplementedKVStore {
        }
    }
}

impl SecureMemoryStore for UnimplementedKVStore {
    fn put(&mut self, key: String, value: &[u8]) {
        
    }

    fn get(&self, key: &str) -> Option<Vec<u8>> {
        self.map.get(key).map(|data| {
            // A copy is created, that is then mutated by the DPAPI unprotect function.
            let mut data = data.clone();
            unsafe {
                CryptUnprotectMemory(
                    data.as_mut_ptr() as *mut core::ffi::c_void,
                    data.len() as u32,
                    CRYPTPROTECTMEMORY_SAME_PROCESS,
                )
            }
            .expect("crypt_unprotect_memory should work");

            // Unpad the data to retrieve the original value
            let length_header_size = std::mem::size_of::<usize>();
            let length_bytes = &data[..length_header_size];
            let data_length = usize::from_le_bytes(
                length_bytes
                    .try_into()
                    .expect("length header should be usize"),
            );

            data[length_header_size..length_header_size + data_length].to_vec()
        })
    }

    fn has(&self, key: &str) -> bool {
        self.map.contains_key(key)
    }

    fn remove(&mut self, key: &str) {
        if let Some(mut value) = self.map.remove(key) {
            unsafe {
                std::ptr::write_bytes(value.as_mut_ptr(), 0, value.len());
            }
        }
    }

    fn clear(&mut self) {
        for (_, mut value) in self.map.drain() {
            unsafe {
                std::ptr::write_bytes(value.as_mut_ptr(), 0, value.len());
            }
        }
    }
}

impl Drop for DpapiSecretKVStore {
    fn drop(&mut self) {
        self.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dpapi_secret_kv_store() {
        let mut store = DpapiSecretKVStore::new();
        let key = "test_key".to_string();
        let value = vec![1, 2, 3, 4, 5];

        store.put(key.clone(), &value);
        assert!(store.has(&key));
        assert_eq!(store.get(&key), Some(value));
    }
}