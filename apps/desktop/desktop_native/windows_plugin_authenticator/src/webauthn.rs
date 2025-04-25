/*
    This file exposes safe functions and types for interacting with the experimental
    Windows WebAuthn API defined here:

    https://github.com/microsoft/webauthn/blob/master/experimental/webauthn.h
*/

use std::ffi::c_uchar;
use std::ptr;
use windows::Win32::Foundation::*;
use windows::Win32::System::Com::*;
use windows::Win32::System::LibraryLoader::*;
use windows_core::*;

use crate::util::*;

/// Used when adding a Windows plugin authenticator.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_ADD_AUTHENTICATOR_OPTIONS
/// Header File Usage: EXPERIMENTAL_WebAuthNPluginAddAuthenticator()
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginAddAuthenticatorOptions {
    pub authenticator_name: *const u16,
    pub plugin_clsid: *const u16,
    pub rpid: *const u16,
    pub light_theme_logo: *const u16,
    pub dark_theme_logo: *const u16,
    pub cbor_authenticator_info_byte_count: u32,
    pub cbor_authenticator_info: *const u8,
}

/// Used as a response type when adding a Windows plugin authenticator.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_ADD_AUTHENTICATOR_RESPONSE
/// Header File Usage: EXPERIMENTAL_WebAuthNPluginAddAuthenticator()
///                    EXPERIMENTAL_WebAuthNPluginFreeAddAuthenticatorResponse()
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginAddAuthenticatorResponse {
    pub plugin_operation_signing_key_byte_count: u32,
    pub plugin_operation_signing_key: *mut u8,
}

/// Represents a credential.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_CREDENTIAL_DETAILS
/// Header File Usage: _EXPERIMENTAL_WEBAUTHN_PLUGIN_CREDENTIAL_DETAILS_LIST
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginCredentialDetails {
    pub credential_id_byte_count: u32,
    pub credential_id_pointer: *mut u8,
    pub rpid: *mut u16,
    pub rp_friendly_name: *mut u16,
    pub user_id_byte_count: u32,
    pub user_id: *mut u16,
    pub user_name: *mut u16,
    pub user_display_name: *mut u16,
}

impl ExperimentalWebAuthnPluginCredentialDetails {
    pub fn create(
        credential_id: String,
        rpid: String,
        rp_friendly_name: String,
        user_id: String,
        user_name: String,
        user_display_name: String,
    ) -> Self {
        let (credential_id_pointer, credential_id_byte_count) = credential_id.into_win_utf8();
        let (user_id, user_id_byte_count) = user_id.into_win_utf16();

        Self {
            credential_id_byte_count,
            credential_id_pointer,
            rpid: rpid.into_win_utf16().0,
            rp_friendly_name: rp_friendly_name.into_win_utf16().0,
            user_id_byte_count,
            user_id,
            user_name: user_name.into_win_utf16().0,
            user_display_name: user_display_name.into_win_utf16().0,
        }
    }
}

/// Represents a list of credentials.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_CREDENTIAL_DETAILS_LIST
/// Header File Usage: EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentials()
///                    EXPERIMENTAL_WebAuthNPluginAuthenticatorRemoveCredentials()
///                    EXPERIMENTAL_WebAuthNPluginAuthenticatorGetAllCredentials()
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginCredentialDetailsList {
    pub plugin_clsid: *mut u16,
    pub credential_count: u32,
    pub credentials: *mut *mut ExperimentalWebAuthnPluginCredentialDetails,
}

/*
let mut credentials: Vec<ExperimentalWebAuthnPluginCredentialDetails>

let mut credentials: Vec<*mut ExperimentalWebAuthnPluginCredentialDetails> = credentials
    .iter()
    .map(|cred| cred as *mut _)
    .collect();

let credentials_len = credentials.len();
let credentials_capacity = credentials.capacity();
let mut credentials_pointer = credentials.as_mut_ptr();
std::mem::forget(credentials);
*/

impl ExperimentalWebAuthnPluginCredentialDetailsList {
    pub fn create(
        clsid: String,
        mut credentials: Vec<ExperimentalWebAuthnPluginCredentialDetails>,
    ) -> Self {
        let mut credentials: Vec<*mut ExperimentalWebAuthnPluginCredentialDetails> = credentials
            .into_iter()
            .map(|mut cred| {
                let cred_pointer: *mut ExperimentalWebAuthnPluginCredentialDetails = &mut cred;
                cred_pointer
            })
            .collect();

        let credentials_len = credentials.len();
        let _credentials_capacity = credentials.capacity();
        let mut credentials_pointer = credentials.as_mut_ptr();
        // TODO: remember the above 3 so it can be re-created and dropped later - refactor this
        std::mem::forget(credentials); // forget so Rust doesn't drop the memory

        Self {
            plugin_clsid: clsid.into_win_utf16().0,
            credential_count: credentials_len as u32,
            credentials: credentials_pointer,
        }
    }
}

type EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentialsFnDeclaration =
    unsafe extern "cdecl" fn(
        pCredentialDetailsList: *mut ExperimentalWebAuthnPluginCredentialDetailsList,
    ) -> HRESULT;

pub fn add_credentials(
    mut credentials_list: ExperimentalWebAuthnPluginCredentialDetailsList,
) -> std::result::Result<(), String> {
    let result = unsafe {
        delay_load::<EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentialsFnDeclaration>(
            s!("webauthn.dll"),
            s!("EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentials"),
        )
    };

    match result {
        Some(api) => {
            let result = unsafe { api(&mut credentials_list) };

            if result.is_err() {
                return Err(format!(
                    "Error: Error response from EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentials()\n{}",
                    result.message()
                ));
            }

            Ok(())
        },
        None => {
            Err(String::from("Error: Can't complete add_credentials(), as the function EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentials can't be loaded."))
        }
    }
}
