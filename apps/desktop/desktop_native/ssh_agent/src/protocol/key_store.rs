use crate::{
    memory::UnlockedSshItem,
    protocol::{
        connection::ConnectionInfo,
        types::{PublicKey, PublicKeyWithName},
    },
};

pub(crate) trait Agent: Send + Sync {
    async fn request_can_list(
        &self,
        connection_info: &ConnectionInfo,
    ) -> Result<bool, anyhow::Error>;
    async fn list_keys(&self) -> Result<Vec<PublicKeyWithName>, anyhow::Error>;
    async fn request_can_sign(
        &self,
        public_key: &PublicKey,
        connection_info: &ConnectionInfo,
    ) -> Result<bool, anyhow::Error>;
    async fn find_ssh_item(
        &self,
        public_key: &PublicKey,
    ) -> Result<Option<UnlockedSshItem>, anyhow::Error>;
}

#[cfg(test)]
pub const PRIVATE_ED25519_KEY: &str = "-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBDUDO7ChZIednIJxGA95T/ZTyREftahrFEJM/eeC8mmAAAAKByJoOYciaD
mAAAAAtzc2gtZWQyNTUxOQAAACBDUDO7ChZIednIJxGA95T/ZTyREftahrFEJM/eeC8mmA
AAAEBQK5JpycFzP/4rchfpZhbdwxjTwHNuGx2/kvG4i6xfp0NQM7sKFkh52cgnEYD3lP9l
PJER+1qGsUQkz954LyaYAAAAHHF1ZXh0ZW5ATWFjQm9vay1Qcm8tMTYubG9jYWwB
-----END OPENSSH PRIVATE KEY-----";
