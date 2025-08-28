pub struct BiometricLockSystem {}

impl BiometricLockSystem {
    pub fn new() -> Self {
        Self {}
    }
}

impl super::BiometricV2Trait for BiometricLockSystem {
    async fn authenticate(&self, _hwnd: Vec<u8>, _message: String) -> Result<bool, anyhow::Error> {
        return Ok(false);
    }

    async fn authenticate_available(&self) -> Result<bool, anyhow::Error> {
        return Ok(false);
    }

    async fn enroll_persistent(&self, _user_id: &str, _key: &[u8]) -> Result<(), anyhow::Error> {
        Ok(())
    }

    async fn provide_key(&self, _user_id: &str, _key: &[u8]) {}

    async fn unlock(&self, _user_id: &str, _hwnd: Vec<u8>) -> Result<Vec<u8>, anyhow::Error> {
        unimplemented!()
    }

    async fn unlock_available(&self, _user_id: &str) -> Result<bool, anyhow::Error> {
        unimplemented!()
    }

    async fn has_persistent(&self, _user_id: &str) -> Result<bool, anyhow::Error> {
        unimplemented!()
    }
}
