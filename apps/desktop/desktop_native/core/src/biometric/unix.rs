use std::{collections::HashMap, hash::Hash, str::FromStr, string};

use anyhow::Result;
use base64::Engine;
use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::biometric::{base64_engine, KeyMaterial, OsDerivedKey};
use zbus::{names::OwnedUniqueName, zvariant::OwnedValue, Connection};
use zbus_polkit::policykit1::*;

use super::{decrypt, encrypt};
use crate::crypto::CipherString;
use anyhow::anyhow;

const BITWARDEN_ACTION: &str = "com.bitwarden.Bitwarden.unlock";
const SYSTEM_ACTION: &str = "org.freedesktop.policykit.exec";

/// The Unix implementation of the biometric trait.
pub struct Biometric {}

async fn action_available(action_id: String) -> Result<bool> {
    let connection = Connection::system().await?;
    let proxy = AuthorityProxy::new(&connection).await?;
    let res = proxy.enumerate_actions("en").await?;
    for action in res {
        if action.action_id == action_id {
            return Ok(true);
        }
    }
    return Ok(false);
}

impl super::BiometricTrait for Biometric {
    async fn prompt(_hwnd: Vec<u8>, _message: String) -> Result<bool> {
        let connection = Connection::system().await?;
        let proxy = AuthorityProxy::new(&connection).await?;
        let mut subject_details = HashMap::new();
        let bus_name = if let Some(name) = connection.unique_name() {
            name
        } else {
            println!("polkit: could not get bus name");
            return Ok(false);
        };

        subject_details.insert("name".to_string(), OwnedUniqueName::from(bus_name.clone()).try_into()?);
        let subject = Subject{
            subject_kind: "system-bus-name".to_string(),
            subject_details,
        };
        let details = std::collections::HashMap::new();

        let result = if action_available(BITWARDEN_ACTION.to_string()).await? {
            proxy
                .check_authorization(
                    &subject,
                    BITWARDEN_ACTION,
                    &details,
                    CheckAuthorizationFlags::AllowUserInteraction.into(),
                    "",
                )
                .await
        } else  {
            proxy
            .check_authorization(
                &subject,
                SYSTEM_ACTION,
                &details,
                CheckAuthorizationFlags::AllowUserInteraction.into(),
                "",
            )
            .await
        };

        match result {
            Ok(result) => {
                return Ok(result.is_authorized);
            }
            Err(e) => {
                println!("polkit biometric error: {:?}", e);
                return Ok(false);
            }
        }
    }

    async fn available() -> Result<bool> {
        if action_available(BITWARDEN_ACTION.to_string()).await? || action_available(SYSTEM_ACTION.to_string()).await? {
            return Ok(true);
        }
        return Ok(false);
    }

    async fn needs_setup() -> Result<bool> {
        if action_available(BITWARDEN_ACTION.to_string()).await? {
            return Ok(false);
        }
        return Ok(true);
    }

    fn derive_key_material(challenge_str: Option<&str>) -> Result<OsDerivedKey> {
        let challenge: [u8; 16] = match challenge_str {
            Some(challenge_str) => base64_engine
                .decode(challenge_str)?
                .try_into()
                .map_err(|e: Vec<_>| anyhow!("Expect length {}, got {}", 16, e.len()))?,
            None => random_challenge(),
        };

        // there is no windows hello like interactive bio protected secret at the moment on linux
        // so we use a a key derived from the iv. this key is not intended to add any security
        // but only a place-holder
        let key = Sha256::digest(challenge);
        let key_b64 = base64_engine.encode(&key);
        let iv_b64 = base64_engine.encode(&challenge);
        Ok(OsDerivedKey { key_b64, iv_b64 })
    }

    fn set_biometric_secret(
        service: &str,
        account: &str,
        secret: &str,
        key_material: Option<KeyMaterial>,
        iv_b64: &str,
    ) -> Result<String> {
        let key_material = key_material.ok_or(anyhow!(
            "Key material is required for polkit protected keys"
        ))?;

        let encrypted_secret = encrypt(secret, &key_material, iv_b64)?;
        crate::password::set_password(service, account, &encrypted_secret)?;
        Ok(encrypted_secret)
    }

    fn get_biometric_secret(
        service: &str,
        account: &str,
        key_material: Option<KeyMaterial>,
    ) -> Result<String> {
        let key_material = key_material.ok_or(anyhow!(
            "Key material is required for polkit protected keys"
        ))?;

        let encrypted_secret = crate::password::get_password(service, account)?;
        let secret = CipherString::from_str(&encrypted_secret)?;
        return Ok(decrypt(&secret, &key_material)?);
    }
}

fn random_challenge() -> [u8; 16] {
    let mut challenge = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut challenge);
    challenge
}
