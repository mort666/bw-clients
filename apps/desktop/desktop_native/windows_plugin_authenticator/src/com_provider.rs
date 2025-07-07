use std::ptr;
use windows::Win32::System::Com::*;
use windows_core::{implement, interface, IInspectable, IUnknown, Interface, HRESULT};

use crate::assert::{
    create_get_assertion_response, decode_get_assertion_request, send_assertion_request,
    WindowsAssertionRequest,
};
use crate::make_credential::{
    create_make_credential_response, decode_make_credential_request, send_registration_request,
    WindowsRegistrationRequest,
};
use crate::types::*;
use crate::utils::{self as util, wstr_to_string};
use crate::webauthn::WEBAUTHN_CREDENTIAL_LIST;

/// Used when creating and asserting credentials.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_OPERATION_REQUEST
/// Header File Usage: EXPERIMENTAL_PluginMakeCredential()
///                    EXPERIMENTAL_PluginGetAssertion()
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginOperationRequest {
    pub window_handle: windows::Win32::Foundation::HWND,
    pub transaction_id: windows_core::GUID,
    pub request_signature_byte_count: u32,
    pub request_signature_pointer: *mut u8,
    pub encoded_request_byte_count: u32,
    pub encoded_request_pointer: *mut u8,
}

/// Used as a response when creating and asserting credentials.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_OPERATION_RESPONSE
/// Header File Usage: EXPERIMENTAL_PluginMakeCredential()
///                    EXPERIMENTAL_PluginGetAssertion()
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginOperationResponse {
    pub encoded_response_byte_count: u32,
    pub encoded_response_pointer: *mut u8,
}

/// Used to cancel an operation.
/// Header File Name: _EXPERIMENTAL_WEBAUTHN_PLUGIN_CANCEL_OPERATION_REQUEST
/// Header File Usage: EXPERIMENTAL_PluginCancelOperation()
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct ExperimentalWebAuthnPluginCancelOperationRequest {
    pub transaction_id: windows_core::GUID,
    pub request_signature_byte_count: u32,
    pub request_signature_pointer: *mut u8,
}

#[interface("e6466e9a-b2f3-47c5-b88d-89bc14a8d998")]
pub unsafe trait EXPERIMENTAL_IPluginAuthenticator: windows_core::IUnknown {
    fn EXPERIMENTAL_PluginMakeCredential(
        &self,
        request: *const ExperimentalWebAuthnPluginOperationRequest,
        response: *mut *mut ExperimentalWebAuthnPluginOperationResponse,
    ) -> HRESULT;
    fn EXPERIMENTAL_PluginGetAssertion(
        &self,
        request: *const ExperimentalWebAuthnPluginOperationRequest,
        response: *mut *mut ExperimentalWebAuthnPluginOperationResponse,
    ) -> HRESULT;
    fn EXPERIMENTAL_PluginCancelOperation(
        &self,
        request: *const ExperimentalWebAuthnPluginCancelOperationRequest,
    ) -> HRESULT;
}

pub unsafe fn parse_credential_list(credential_list: &WEBAUTHN_CREDENTIAL_LIST) -> Vec<Vec<u8>> {
    let mut allowed_credentials = Vec::new();

    if credential_list.cCredentials == 0 || credential_list.ppCredentials.is_null() {
        util::message("No credentials in credential list");
        return allowed_credentials;
    }

    util::message(&format!(
        "Parsing {} credentials from credential list",
        credential_list.cCredentials
    ));

    // ppCredentials is an array of pointers to WEBAUTHN_CREDENTIAL_EX
    let credentials_array = std::slice::from_raw_parts(
        credential_list.ppCredentials,
        credential_list.cCredentials as usize,
    );

    for (i, &credential_ptr) in credentials_array.iter().enumerate() {
        if credential_ptr.is_null() {
            util::message(&format!("WARNING: Credential {} is null, skipping", i));
            continue;
        }

        let credential = &*credential_ptr;

        if credential.cbId == 0 || credential.pbId.is_null() {
            util::message(&format!(
                "WARNING: Credential {} has invalid ID, skipping",
                i
            ));
            continue;
        }

        // Extract credential ID bytes
        let credential_id_slice =
            std::slice::from_raw_parts(credential.pbId, credential.cbId as usize);

        allowed_credentials.push(credential_id_slice.to_vec());
        util::message(&format!(
            "Parsed credential {}: {} bytes",
            i, credential.cbId
        ));
    }

    util::message(&format!(
        "Successfully parsed {} allowed credentials",
        allowed_credentials.len()
    ));
    allowed_credentials
}

#[implement(EXPERIMENTAL_IPluginAuthenticator)]
pub struct PluginAuthenticatorComObject;

#[implement(IClassFactory)]
pub struct Factory;

impl EXPERIMENTAL_IPluginAuthenticator_Impl for PluginAuthenticatorComObject_Impl {
    unsafe fn EXPERIMENTAL_PluginMakeCredential(
        &self,
        request: *const ExperimentalWebAuthnPluginOperationRequest,
        response: *mut *mut ExperimentalWebAuthnPluginOperationResponse,
    ) -> HRESULT {
        util::message("=== EXPERIMENTAL_PluginMakeCredential() called ===");

        if request.is_null() {
            util::message("ERROR: NULL request pointer");
            return HRESULT(-1);
        }

        if response.is_null() {
            util::message("ERROR: NULL response pointer");
            return HRESULT(-1);
        }

        let req = &*request;
        let transaction_id = format!("{:?}", req.transaction_id);

        util::message(&format!("Transaction ID: {}", transaction_id));
        util::message(&format!("Window Handle: {:?}", req.window_handle));
        util::message(&format!(
            "Request Signature Byte Count: {}",
            req.request_signature_byte_count
        ));
        util::message(&format!(
            "Encoded Request Byte Count: {}",
            req.encoded_request_byte_count
        ));

        if req.encoded_request_byte_count == 0 || req.encoded_request_pointer.is_null() {
            util::message("ERROR: No encoded request data provided");
            return HRESULT(-1);
        }

        let encoded_request_slice = std::slice::from_raw_parts(
            req.encoded_request_pointer,
            req.encoded_request_byte_count as usize,
        );

        util::message(&format!(
            "Encoded request: {} bytes",
            encoded_request_slice.len()
        ));

        // Try to decode the request using Windows API
        match decode_make_credential_request(encoded_request_slice) {
            Ok(decoded_wrapper) => {
                let decoded_request = decoded_wrapper.as_ref();
                util::message("Successfully decoded make credential request using Windows API");

                // Extract RP information
                if decoded_request.pRpInformation.is_null() {
                    util::message("ERROR: RP information is null");
                    return HRESULT(-1);
                }

                let rp_info = &*decoded_request.pRpInformation;

                let rpid = if rp_info.pwszId.is_null() {
                    util::message("ERROR: RP ID is null");
                    return HRESULT(-1);
                } else {
                    match wstr_to_string(rp_info.pwszId) {
                        Ok(id) => id,
                        Err(e) => {
                            util::message(&format!("ERROR: Failed to decode RP ID: {}", e));
                            return HRESULT(-1);
                        }
                    }
                };

                let rp_name = if rp_info.pwszName.is_null() {
                    String::new()
                } else {
                    wstr_to_string(rp_info.pwszName).unwrap_or_default()
                };

                // Extract user information
                if decoded_request.pUserInformation.is_null() {
                    util::message("ERROR: User information is null");
                    return HRESULT(-1);
                }

                let user = &*decoded_request.pUserInformation;

                let user_id = if user.pbId.is_null() || user.cbId == 0 {
                    util::message("ERROR: User ID is required for registration");
                    return HRESULT(-1);
                } else {
                    let id_slice = std::slice::from_raw_parts(user.pbId, user.cbId as usize);
                    id_slice.to_vec()
                };

                let user_name = if user.pwszName.is_null() {
                    util::message("ERROR: User name is required for registration");
                    return HRESULT(-1);
                } else {
                    match wstr_to_string(user.pwszName) {
                        Ok(name) => name,
                        Err(_) => {
                            util::message("ERROR: Failed to decode user name");
                            return HRESULT(-1);
                        }
                    }
                };

                let user_display_name = if user.pwszDisplayName.is_null() {
                    None
                } else {
                    wstr_to_string(user.pwszDisplayName).ok()
                };

                let user_info = (user_id, user_name, user_display_name);

                // Extract client data hash
                let client_data_hash = if decoded_request.cbClientDataHash == 0
                    || decoded_request.pbClientDataHash.is_null()
                {
                    util::message("ERROR: Client data hash is required for registration");
                    return HRESULT(-1);
                } else {
                    let hash_slice = std::slice::from_raw_parts(
                        decoded_request.pbClientDataHash,
                        decoded_request.cbClientDataHash as usize,
                    );
                    hash_slice.to_vec()
                };

                // Extract RP ID raw bytes for authenticator data
                let rpid_bytes = if decoded_request.cbRpId > 0 && !decoded_request.pbRpId.is_null()
                {
                    let rpid_slice = std::slice::from_raw_parts(
                        decoded_request.pbRpId,
                        decoded_request.cbRpId as usize,
                    );
                    rpid_slice.to_vec()
                } else {
                    rpid.as_bytes().to_vec()
                };

                // Extract supported algorithms
                let supported_algorithms = if decoded_request
                    .WebAuthNCredentialParameters
                    .cCredentialParameters
                    > 0
                    && !decoded_request
                        .WebAuthNCredentialParameters
                        .pCredentialParameters
                        .is_null()
                {
                    let params_count = decoded_request
                        .WebAuthNCredentialParameters
                        .cCredentialParameters as usize;
                    let params_ptr = decoded_request
                        .WebAuthNCredentialParameters
                        .pCredentialParameters;

                    (0..params_count)
                        .map(|i| unsafe { &*params_ptr.add(i) }.lAlg)
                        .collect()
                } else {
                    Vec::new()
                };

                // Extract user verification requirement from authenticator options
                let user_verification = if !decoded_request.pAuthenticatorOptions.is_null() {
                    let auth_options = &*decoded_request.pAuthenticatorOptions;
                    match auth_options.user_verification {
                        1 => Some(UserVerificationRequirement::Required),
                        -1 => Some(UserVerificationRequirement::Discouraged),
                        0 | _ => Some(UserVerificationRequirement::Preferred), // Default or undefined
                    }
                } else {
                    None
                };

                // Extract excluded credentials from credential list (for make credential, these are credentials to exclude)
                let excluded_credentials = parse_credential_list(&decoded_request.CredentialList);
                if !excluded_credentials.is_empty() {
                    util::message(&format!(
                        "Found {} excluded credentials for make credential",
                        excluded_credentials.len()
                    ));
                }

                // Create Windows registration request
                let registration_request = WindowsRegistrationRequest {
                    rpid: rpid.clone(),
                    user_id: user_info.0,
                    user_name: user_info.1,
                    user_display_name: user_info.2,
                    client_data_hash,
                    excluded_credentials,
                    user_verification: user_verification.unwrap_or_default(),
                    supported_algorithms,
                };

                util::message(&format!(
                    "Make credential request - RP: {}, User: {}",
                    rpid, registration_request.user_name
                ));

                // Send registration request
                if let Some(passkey_response) =
                    send_registration_request(&transaction_id, &registration_request)
                {
                    util::message(&format!(
                        "Registration response received: {:?}",
                        passkey_response
                    ));

                    // Create proper WebAuthn response from passkey_response
                    match passkey_response {
                        PasskeyResponse::RegistrationResponse {
                            credential_id,
                            attestation_object,
                            rp_id,
                            client_data_hash,
                        } => {
                            util::message("Creating WebAuthn make credential response");

                            match create_make_credential_response(credential_id, attestation_object)
                            {
                                Ok(webauthn_response) => {
                                    util::message("Successfully created WebAuthn response");
                                    *response = webauthn_response;
                                    HRESULT(0)
                                }
                                Err(e) => {
                                    util::message(&format!(
                                        "ERROR: Failed to create WebAuthn response: {}",
                                        e
                                    ));
                                    *response = ptr::null_mut();
                                    HRESULT(-1)
                                }
                            }
                        }
                        PasskeyResponse::Error { message } => {
                            util::message(&format!("Registration request failed: {}", message));
                            *response = ptr::null_mut();
                            HRESULT(-1)
                        }
                        _ => {
                            util::message(
                                "ERROR: Unexpected response type for registration request",
                            );
                            *response = ptr::null_mut();
                            HRESULT(-1)
                        }
                    }
                } else {
                    util::message("ERROR: No response from registration request");
                    *response = ptr::null_mut();
                    HRESULT(-1)
                }
            }
            Err(e) => {
                util::message(&format!(
                    "ERROR: Failed to decode make credential request: {}",
                    e
                ));
                *response = ptr::null_mut();
                HRESULT(-1)
            }
        }
    }

    unsafe fn EXPERIMENTAL_PluginGetAssertion(
        &self,
        request: *const ExperimentalWebAuthnPluginOperationRequest,
        response: *mut *mut ExperimentalWebAuthnPluginOperationResponse,
    ) -> HRESULT {
        util::message("EXPERIMENTAL_PluginGetAssertion() called");

        // Validate input parameters
        if request.is_null() || response.is_null() {
            util::message("Invalid parameters passed to EXPERIMENTAL_PluginGetAssertion");
            return HRESULT(-1);
        }

        let req = &*request;
        let transaction_id = format!("{:?}", req.transaction_id);

        util::message(&format!(
            "Get assertion request - Transaction: {}",
            transaction_id
        ));

        if req.encoded_request_byte_count == 0 || req.encoded_request_pointer.is_null() {
            util::message("ERROR: No encoded request data provided");
            *response = ptr::null_mut();
            return HRESULT(-1);
        }

        let encoded_request_slice = std::slice::from_raw_parts(
            req.encoded_request_pointer,
            req.encoded_request_byte_count as usize,
        );

        // Try to decode the request using Windows API
        match decode_get_assertion_request(encoded_request_slice) {
            Ok(decoded_wrapper) => {
                let decoded_request = decoded_wrapper.as_ref();
                util::message("Successfully decoded get assertion request using Windows API");

                // Extract RP information
                let rpid = if decoded_request.pwszRpId.is_null() {
                    util::message("ERROR: RP ID is null");
                    *response = ptr::null_mut();
                    return HRESULT(-1);
                } else {
                    match wstr_to_string(decoded_request.pwszRpId) {
                        Ok(id) => id,
                        Err(e) => {
                            util::message(&format!("ERROR: Failed to decode RP ID: {}", e));
                            *response = ptr::null_mut();
                            return HRESULT(-1);
                        }
                    }
                };

                // Extract client data hash
                let client_data_hash = if decoded_request.cbClientDataHash == 0
                    || decoded_request.pbClientDataHash.is_null()
                {
                    util::message("ERROR: Client data hash is required for assertion");
                    *response = ptr::null_mut();
                    return HRESULT(-1);
                } else {
                    let hash_slice = std::slice::from_raw_parts(
                        decoded_request.pbClientDataHash,
                        decoded_request.cbClientDataHash as usize,
                    );
                    hash_slice.to_vec()
                };

                // Extract user verification requirement from authenticator options
                let user_verification = if !decoded_request.pAuthenticatorOptions.is_null() {
                    let auth_options = &*decoded_request.pAuthenticatorOptions;
                    match auth_options.user_verification {
                        1 => Some(UserVerificationRequirement::Required),
                        -1 => Some(UserVerificationRequirement::Discouraged),
                        0 | _ => Some(UserVerificationRequirement::Preferred), // Default or undefined
                    }
                } else {
                    None
                };

                // Extract allowed credentials from credential list
                let allowed_credentials = parse_credential_list(&decoded_request.CredentialList);

                // Create Windows assertion request
                let assertion_request = WindowsAssertionRequest {
                    rpid: rpid.clone(),
                    client_data_hash,
                    allowed_credentials: allowed_credentials.clone(),
                    user_verification: user_verification.unwrap_or_default(),
                };

                util::message(&format!(
                    "Get assertion request - RP: {}, Allowed credentials: {}",
                    rpid,
                    allowed_credentials.len()
                ));

                // Send assertion request
                if let Some(passkey_response) =
                    send_assertion_request(&transaction_id, &assertion_request)
                {
                    util::message(&format!(
                        "Assertion response received: {:?}",
                        passkey_response
                    ));

                    // Create proper WebAuthn response from passkey_response
                    match passkey_response {
                        PasskeyResponse::AssertionResponse {
                            credential_id,
                            authenticator_data,
                            signature,
                            user_handle,
                            rp_id,
                            client_data_hash,
                        } => {
                            util::message("Creating WebAuthn get assertion response");

                            match create_get_assertion_response(
                                credential_id,
                                authenticator_data,
                                signature,
                                user_handle,
                            ) {
                                Ok(webauthn_response) => {
                                    util::message(
                                        "Successfully created WebAuthn assertion response",
                                    );
                                    *response = webauthn_response;
                                    HRESULT(0)
                                }
                                Err(e) => {
                                    util::message(&format!(
                                        "ERROR: Failed to create WebAuthn assertion response: {}",
                                        e
                                    ));
                                    *response = ptr::null_mut();
                                    HRESULT(-1)
                                }
                            }
                        }
                        PasskeyResponse::Error { message } => {
                            util::message(&format!("Assertion request failed: {}", message));
                            *response = ptr::null_mut();
                            HRESULT(-1)
                        }
                        _ => {
                            util::message("ERROR: Unexpected response type for assertion request");
                            *response = ptr::null_mut();
                            HRESULT(-1)
                        }
                    }
                } else {
                    util::message("ERROR: No response from assertion request");
                    *response = ptr::null_mut();
                    HRESULT(-1)
                }
            }
            Err(e) => {
                util::message(&format!(
                    "ERROR: Failed to decode get assertion request: {}",
                    e
                ));
                *response = ptr::null_mut();
                HRESULT(-1)
            }
        }
    }

    unsafe fn EXPERIMENTAL_PluginCancelOperation(
        &self,
        request: *const ExperimentalWebAuthnPluginCancelOperationRequest,
    ) -> HRESULT {
        util::message("EXPERIMENTAL_PluginCancelOperation() called");
        HRESULT(0)
    }
}

impl IClassFactory_Impl for Factory_Impl {
    fn CreateInstance(
        &self,
        outer: windows_core::Ref<IUnknown>,
        iid: *const windows_core::GUID,
        object: *mut *mut core::ffi::c_void,
    ) -> windows_core::Result<()> {
        let unknown: IInspectable = PluginAuthenticatorComObject.into(); // TODO: IUnknown ?
        unsafe { unknown.query(iid, object).ok() }
    }

    fn LockServer(&self, lock: windows_core::BOOL) -> windows_core::Result<()> {
        Ok(())
    }
}
