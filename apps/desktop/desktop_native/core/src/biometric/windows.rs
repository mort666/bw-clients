//! This file implements Windows-Hello based biometric unlock.
//! 
//! # Security
//! Note: There are two scenarios to consider, with different security implications. This section
//! describes the assumed security model and security guarantees achieved. In the required security
//! guarantee is that a locked vault - a running app - cannot be unlocked when the device (user-space)
//! is compromised in this state.
//! 
//! 1. Require master password on app restart
//! In this scenario, when first unlocking the app, the app sends the user-key to this module, which holds it in secure memory,
//! protected by DPAPI. This makes it inaccessible to other processes, unless they compromise the system administrator, or kernel.
//! While the app is running this key is held in memory, even if locked. When unlocking, the app will prompt the user via
//! `windows_hello_authenticate` to get a yes/no decision on whether to release the key to the app.
//! 
//! 2. Do not require master password on app restart
//! In this scenario, when enrolling, the app sends the user-key to this module, which derives the windows hello key 
//! with the Windows Hello prompt. This is done by signing a per-user challenge, which produces a deterministic 
//! signature which is hashed to obtain a key. This key is used to encrypt and persist the vault unlock key (user key).
//! 
//! Since the keychain can be accessed by all user-space processes, the challenge is known to all userspace processes.
//! Therefore, to circumvent the security measure, the attacker would need to create a fake Windows-Hello prompt, and
//! get the user to confirm it.

use std::{ffi::c_void, sync::{atomic::AtomicBool, Arc}};

use aes::cipher::KeyInit;
use anyhow::{anyhow, Result};
use chacha20poly1305::{aead::Aead, XChaCha20Poly1305, XNonce};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;
use windows::{
    core::{factory, h, HSTRING},
    Security::{Credentials::{KeyCredentialCreationOption, KeyCredentialManager, KeyCredentialStatus, UI::{
        UserConsentVerificationResult, UserConsentVerifier, UserConsentVerifierAvailability,
    }}, Cryptography::CryptographicBuffer},
    Win32::{
        Foundation::HWND, System::WinRT::IUserConsentVerifierInterop,
        UI::WindowsAndMessaging::GetForegroundWindow,
    },
};
use windows_future::IAsyncOperation;

use super::windows_focus::{focus_security_prompt, set_focus};
use crate::{
    password, secure_memory::*
};

const KEYCHAIN_SERVICE_NAME: &str = "BitwardenBiometricsV2";

#[derive(serde::Serialize, serde::Deserialize)]
struct WindowsHelloKeychainEntry {
    nonce: [u8; 24],
    challenge: [u8; 16],
    wrapped_key: Vec<u8>,
}

/// The Windows OS implementation of the biometric trait.
pub struct BiometricLockSystem {
    // The userkeys that are held in memory MUST be protected from memory dumping attacks, to ensure
    // locked vaults cannot be unlocked
    secure_memory: Arc<Mutex<crate::secure_memory::dpapi::DpapiSecretKVStore>>
}

impl BiometricLockSystem {
    pub fn new() -> Self {
        Self {
            secure_memory: Arc::new(Mutex::new(crate::secure_memory::dpapi::DpapiSecretKVStore::new())),
        }
    }
}

impl super::BiometricTrait for BiometricLockSystem {
    async fn authenticate(&self, hwnd: Vec<u8>, message: String) -> Result<bool> {
        windows_hello_authenticate(hwnd, message)
    }

    async fn authenticate_available(&self) -> Result<bool> {
        match UserConsentVerifier::CheckAvailabilityAsync()?.get()? {
            UserConsentVerifierAvailability::Available => Ok(true),
            UserConsentVerifierAvailability::DeviceBusy => Ok(true),
            _ => Ok(false),
        }
    }

    async fn unenroll(&self, user_id: &str) -> Result<()> {
        let mut secure_memory = self.secure_memory.lock().await;
        secure_memory.remove(user_id);
        delete_keychain_entry(user_id).await?;
        Ok(())
    }

    async fn enroll_persistent(&self, user_id: &str, key: &[u8]) -> Result<()> {
        // Enrollment works by first generating a random challenge unique to the user / enrollment. Then,
        // with the challenge and a Windows-Hello prompt, the "windows hello key" is derived. The windows
        // hello key is used to encrypt the key to store with XChaCha20Poly1305. The bundle of nonce,
        // challenge and wrapped-key are stored to the keychain

        // Each enrollment (per user) has a unique challenge, so that the windows-hello key is unique
        let mut challenge = [0u8; 16];
        rand::fill(&mut challenge);

        // This key is unique to the challenge
        let windows_hello_key = windows_hello_authenticate_with_crypto(&challenge)?;

        let nonce = {
            let mut nonce_bytes = [0u8; 24];
            rand::fill(&mut nonce_bytes);
            XNonce::clone_from_slice(&nonce_bytes)
        };

        let wrapped_key = XChaCha20Poly1305::new(&windows_hello_key.into()).encrypt(&nonce, key).map_err(|e| anyhow!(e))?;
        set_keychain_entry(user_id, &WindowsHelloKeychainEntry {
            nonce: nonce.as_slice().try_into().map_err(|_| anyhow!("Invalid nonce length"))?,
            challenge,
            wrapped_key,
        }).await?;
        Ok(())
    }

    async fn provide_key(&self, user_id: &str, key: &[u8]) {
        let mut secure_memory = self.secure_memory.lock().await;
        secure_memory.put(user_id.to_string(), key);
    }

    async fn unlock(&self, user_id: &str, hwnd: Vec<u8>) -> Result<Vec<u8>> {
        let mut secure_memory = self.secure_memory.lock().await;
        if secure_memory.has(user_id) {
            println!("[Windows Hello] Key is in secure memory, using UV API");
            
            if self.authenticate(hwnd, "Unlock your vault".to_owned()).await? {
                println!("[Windows Hello] Authentication successful");
                return secure_memory.get(user_id).clone().ok_or_else(|| anyhow!("No key found for user"));
            }
            Err(anyhow!("Authentication failed"))
        } else {
            println!("[Windows Hello] Key not in secure memory, using Signing API");

            let keychain_entry = get_keychain_entry(user_id).await?;
            let windows_hello_key = windows_hello_authenticate_with_crypto(&keychain_entry.challenge)?;
            let decrypted_key = XChaCha20Poly1305::new(&windows_hello_key.into()).decrypt(keychain_entry.nonce.as_slice().try_into().map_err(|_| anyhow!("Invalid nonce length"))?, keychain_entry.wrapped_key.as_slice()).map_err(|e| anyhow!(e))?;
            secure_memory.put(user_id.to_string(), &decrypted_key.clone());
            Ok(decrypted_key)
        }
    }

    async fn unlock_available(&self, user_id: &str) -> Result<bool> {
        let secure_memory = self.secure_memory.lock().await;
        let has_key = secure_memory.has(user_id) || has_keychain_entry(user_id).await.unwrap_or(false);
        Ok(has_key && self.authenticate_available().await.unwrap_or(false))
    }
    
    async fn has_persistent(&self, user_id: &str) -> Result<bool> {
        Ok(get_keychain_entry(user_id).await.is_ok())
    }
}

/// Get a yes/no authorization without any cryptographic backing.
/// This API has better focusing behavior
fn windows_hello_authenticate(hwnd: Vec<u8>, message: String) -> Result<bool> {
    let h = isize::from_le_bytes(hwnd.clone().try_into().unwrap());
    let h = h as *mut c_void;
    let window = HWND(h);

    // The Windows Hello prompt is displayed inside the application window. For best result we
    //  should set the window to the foreground and focus it.
    set_focus(window);

    // Windows Hello prompt must be in foreground, focused, otherwise the face or fingerprint
    //  unlock will not work. We get the current foreground window, which will either be the
    //  Bitwarden desktop app or the browser extension.
    let foreground_window = unsafe { GetForegroundWindow() };

    let interop = factory::<UserConsentVerifier, IUserConsentVerifierInterop>()?;
    let operation: IAsyncOperation<UserConsentVerificationResult> = unsafe {
        interop.RequestVerificationForWindowAsync(foreground_window, &HSTRING::from(message))?
    };
    let result = operation.get()?;

    match result {
        UserConsentVerificationResult::Verified => Ok(true),
        _ => Ok(false),
    }
}

/// Derive the symmetric encryption key from the Windows Hello signature.
///
/// This works by signing a static challenge string with Windows Hello protected key store. The
/// signed challenge is then hashed using SHA-256 and used as the symmetric encryption key for the
/// Windows Hello protected keys.
///
/// Windows will only sign the challenge if the user has successfully authenticated with Windows,
/// ensuring user presence.
/// 
/// Note: This API has inconsistent focusing behavior when called from another window
fn windows_hello_authenticate_with_crypto(challenge: &[u8; 16]) -> Result<[u8; 32]> {
    // Ugly hack: We need to focus the window via window focusing APIs until Microsoft releases a new API.
    // This is unreliable, and if it does not work, the operation may fail
    let stop_focusing = Arc::new(AtomicBool::new(false));
    let stop_focusing_clone = stop_focusing.clone();
    let _ = std::thread::spawn(move || loop {
        if !stop_focusing_clone.load(std::sync::atomic::Ordering::Relaxed) {
            focus_security_prompt();
            std::thread::sleep(std::time::Duration::from_millis(500));
        } else {
            break;
        }
    });
    // Only stop focusing once this function exists. The focus MUST run both during the initial creation
    // with RequestCreateAsync, and also with the subsequent use with RequestSignAsync.
    let _guard = scopeguard::guard((), |_| {
        stop_focusing.store(true, std::sync::atomic::Ordering::Relaxed);
    });

    // First create or replace the Bitwarden signing key
    let result = KeyCredentialManager::RequestCreateAsync(
        h!("BitwardenBiometricsV2"),
        KeyCredentialCreationOption::FailIfExists,
    )?
    .get()?;
    let result = match result.Status()? {
        KeyCredentialStatus::CredentialAlreadyExists => {
            KeyCredentialManager::OpenAsync(h!("BitwardenBiometricsV2"))?.get()?
        }
        KeyCredentialStatus::Success => result,
        _ => return Err(anyhow!("Failed to create key credential")),
    };

    let signature = result.Credential()?.RequestSignAsync(&CryptographicBuffer::CreateFromByteArray(challenge.as_slice())?)?.get()?;

    if signature.Status()? == KeyCredentialStatus::Success {
        let signature_buffer = signature.Result()?;
        let mut signature_value =
            windows::core::Array::<u8>::with_len(signature_buffer.Length().unwrap() as usize);
        CryptographicBuffer::CopyToByteArray(&signature_buffer, &mut signature_value)?;

        // The signature is deterministic based on the challenge and keychain key. Thus, it can be hashed to a key.
        // It is unclear what entropy this key provides.
        Ok(Sha256::digest(signature_value.as_slice()).into())
    } else {
        Err(anyhow!("Failed to sign data"))
    }
}

async fn set_keychain_entry(user_id: &str, entry: &WindowsHelloKeychainEntry) -> Result<()> {
    let serialized_entry = serde_json::to_string(entry)?;

    password::set_password(
        KEYCHAIN_SERVICE_NAME,
        user_id,
        &serialized_entry,
    ).await?;

    Ok(())
}

async fn get_keychain_entry(user_id: &str) -> Result<WindowsHelloKeychainEntry> {
    let entry_str = password::get_password(KEYCHAIN_SERVICE_NAME, user_id).await?;
    let entry: WindowsHelloKeychainEntry = serde_json::from_str(&entry_str)?;
    Ok(entry)
}

async fn delete_keychain_entry(user_id: &str) -> Result<()> {
    password::delete_password(KEYCHAIN_SERVICE_NAME, user_id).await?;
    Ok(())
}

async fn has_keychain_entry(user_id: &str) -> Result<bool> {
    let entry = password::get_password(KEYCHAIN_SERVICE_NAME, user_id).await?;
    Ok(!entry.is_empty())
}
