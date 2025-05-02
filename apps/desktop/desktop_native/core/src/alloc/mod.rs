use allocator_api2::alloc::Allocator;
use std::hash::Hash;

mod malloc;

pub(super) type MlockBackend<Key, Value> = CustomAllocBackend<Key, Value, malloc::MlockAlloc>;
pub(super) use malloc::MlockAlloc;

mod linux_memfd_secret;
pub type LinuxMemfdSecretBackend<Key, Value> =
    CustomAllocBackend<Key, Value, linux_memfd_secret::LinuxMemfdSecretAlloc>;
pub(crate) use linux_memfd_secret::LinuxMemfdSecretAlloc;

pub struct CustomAllocBackend<Key: Eq + Hash, Value, Alloc: Allocator + Send + Sync> {
    map: hashbrown::HashMap<Key, Value, hashbrown::DefaultHashBuilder, Alloc>,
}

impl<Key: Eq + Hash, Value, Alloc: Allocator + Send + Sync> CustomAllocBackend<Key, Value, Alloc> {
    pub(super) fn new(alloc: Alloc) -> Self {
        Self {
            map: hashbrown::HashMap::new_in(alloc),
        }
    }
}


impl <Key: Eq + Hash, Value, Alloc: Allocator + Send + Sync> CustomAllocBackend<Key, Value, Alloc> {
    pub fn insert(&mut self, key: Key, value: Value) {
        self.map.insert(key, value);
    }

    pub fn get(&self, key: &Key) -> Option<&Value> {
        self.map.get(key)
    }

    pub fn remove(&mut self, key: &Key) -> Option<Value> {
        self.map.remove(key)
    }
}