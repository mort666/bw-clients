pub struct Biometric {}

impl super::BiometricV2Trait for Biometric {
    async fn authorize(_hwnd: Vec<u8>, _message: String) -> Result<bool> {
        unimplemented!()
    }

    async fn available_available() -> Result<bool> {
        Ok(false)
    }

    async fn enroll_persistent(
        user_id: &str,
        key: &[u8]
    ) -> Result<String> {
        unimplemented!()
    }

    async fn provide_userkey(
        user_id: &str,
        key: &[u8]
    ) -> Result<String> {
        unimplemented!()
    }

    async fn unlock(
        user_id: &str
    ) -> Result<String> {
        unimplemented!()
    }

    async fn unlock_available(
        user_id: &str,
    ) -> Result<bool> {
        Ok(false)
    }
}