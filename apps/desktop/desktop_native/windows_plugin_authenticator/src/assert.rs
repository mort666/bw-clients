use std::alloc::{alloc, Layout};
use std::ptr;
use serde_json;
use windows_core::{HRESULT, s};

use crate::types::*;
use crate::utils::{self as util, delay_load};
use crate::com_provider::ExperimentalWebAuthnPluginOperationResponse;

// Windows API types for WebAuthn (from webauthn.h.sample)
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct EXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST {
    pub dwVersion: u32,
    pub pwszRpId: *const u16,           // PCWSTR
    pub cbRpId: u32,
    pub pbRpId: *const u8,
    pub cbClientDataHash: u32,
    pub pbClientDataHash: *const u8,
    pub CredentialList: WEBAUTHN_CREDENTIAL_LIST,
    pub cbCborExtensionsMap: u32,
    pub pbCborExtensionsMap: *const u8,
    pub pAuthenticatorOptions: *const crate::webauthn::ExperimentalWebAuthnCtapCborAuthenticatorOptions,
    // Add other fields as needed...
}

pub type PEXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST = *mut EXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST;

#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct WEBAUTHN_CREDENTIAL_EX {
    pub dwVersion: u32,
    pub cbId: u32,
    pub pbId: *const u8,
    pub pwszCredentialType: *const u16,  // LPCWSTR
    pub dwTransports: u32,
}

#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct WEBAUTHN_CREDENTIAL_LIST {
    pub cCredentials: u32,
    pub ppCredentials: *const *const WEBAUTHN_CREDENTIAL_EX,
}

// Windows API function signatures for decoding get assertion requests
type EXPERIMENTAL_WebAuthNDecodeGetAssertionRequestFn = unsafe extern "stdcall" fn(
    cbEncoded: u32,
    pbEncoded: *const u8,
    ppGetAssertionRequest: *mut PEXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST,
) -> HRESULT;

type EXPERIMENTAL_WebAuthNFreeDecodedGetAssertionRequestFn = unsafe extern "stdcall" fn(
    pGetAssertionRequest: PEXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST,
);

// RAII wrapper for decoded get assertion request
pub struct DecodedGetAssertionRequest {
    ptr: PEXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST,
    free_fn: Option<EXPERIMENTAL_WebAuthNFreeDecodedGetAssertionRequestFn>,
}

impl DecodedGetAssertionRequest {
    fn new(ptr: PEXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST, free_fn: Option<EXPERIMENTAL_WebAuthNFreeDecodedGetAssertionRequestFn>) -> Self {
        Self { ptr, free_fn }
    }
    
    pub fn as_ref(&self) -> &EXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST {
        unsafe { &*self.ptr }
    }
}

impl Drop for DecodedGetAssertionRequest {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            if let Some(free_fn) = self.free_fn {
                util::message("Freeing decoded get assertion request");
                unsafe { free_fn(self.ptr); }
            }
        }
    }
}

// Function to decode get assertion request using Windows API
pub unsafe fn decode_get_assertion_request(encoded_request: &[u8]) -> Result<DecodedGetAssertionRequest, String> {
    util::message("Attempting to decode get assertion request using Windows API");
    
    // Load the Windows WebAuthn API function
    let decode_fn: Option<EXPERIMENTAL_WebAuthNDecodeGetAssertionRequestFn> = delay_load(
        s!("webauthn.dll"),
        s!("EXPERIMENTAL_WebAuthNDecodeGetAssertionRequest")
    );
    
    let decode_fn = decode_fn.ok_or("Failed to load EXPERIMENTAL_WebAuthNDecodeGetAssertionRequest from webauthn.dll")?;
    
    // Load the free function
    let free_fn: Option<EXPERIMENTAL_WebAuthNFreeDecodedGetAssertionRequestFn> = delay_load(
        s!("webauthn.dll"),
        s!("EXPERIMENTAL_WebAuthNFreeDecodedGetAssertionRequest")
    );
    
    let mut pp_get_assertion_request: PEXPERIMENTAL_WEBAUTHN_CTAPCBOR_GET_ASSERTION_REQUEST = ptr::null_mut();
    
    let result = decode_fn(
        encoded_request.len() as u32,
        encoded_request.as_ptr(),
        &mut pp_get_assertion_request,
    );
    
    if result.is_err() || pp_get_assertion_request.is_null() {
        return Err(format!("EXPERIMENTAL_WebAuthNDecodeGetAssertionRequest failed with HRESULT: {}", result.0));
    }
    
    
    Ok(DecodedGetAssertionRequest::new(pp_get_assertion_request, free_fn))
}

/// Windows WebAuthn assertion request context
#[derive(Debug, Clone)]
pub struct WindowsAssertionRequest {
    pub rpid: String,
    pub client_data_hash: Vec<u8>,
    pub allowed_credentials: Vec<Vec<u8>>,
    pub user_verification: UserVerificationRequirement,
}

/// Windows WebAuthn registration request context  
#[derive(Debug, Clone)]
pub struct WindowsRegistrationRequest {
    pub rpid: String,
    pub user_id: Vec<u8>,
    pub user_name: String,
    pub user_display_name: Option<String>,
    pub client_data_hash: Vec<u8>,
    pub excluded_credentials: Vec<Vec<u8>>,
    pub user_verification: UserVerificationRequirement,
    pub supported_algorithms: Vec<i32>,
}

/// Parse allowed credentials from WEBAUTHN_CREDENTIAL_LIST
pub unsafe fn parse_credential_list(credential_list: &WEBAUTHN_CREDENTIAL_LIST) -> Vec<Vec<u8>> {
    let mut allowed_credentials = Vec::new();
    
    if credential_list.cCredentials == 0 || credential_list.ppCredentials.is_null() {
        util::message("No credentials in credential list");
        return allowed_credentials;
    }
    
    util::message(&format!("Parsing {} credentials from credential list", credential_list.cCredentials));
    
    // ppCredentials is an array of pointers to WEBAUTHN_CREDENTIAL_EX
    let credentials_array = std::slice::from_raw_parts(
        credential_list.ppCredentials,
        credential_list.cCredentials as usize
    );
    
    for (i, &credential_ptr) in credentials_array.iter().enumerate() {
        if credential_ptr.is_null() {
            util::message(&format!("WARNING: Credential {} is null, skipping", i));
            continue;
        }
        
        let credential = &*credential_ptr;
        
        if credential.cbId == 0 || credential.pbId.is_null() {
            util::message(&format!("WARNING: Credential {} has invalid ID, skipping", i));
            continue;
        }
        
        // Extract credential ID bytes
        let credential_id_slice = std::slice::from_raw_parts(
            credential.pbId,
            credential.cbId as usize
        );
        
        allowed_credentials.push(credential_id_slice.to_vec());
        util::message(&format!("Parsed credential {}: {} bytes", i, credential.cbId));
    }
    
    util::message(&format!("Successfully parsed {} allowed credentials", allowed_credentials.len()));
    allowed_credentials
}

/// Helper for assertion requests
pub fn send_assertion_request(transaction_id: &str, request: &WindowsAssertionRequest) -> Option<PasskeyResponse> {
    let passkey_request = PasskeyAssertionRequest {
        rp_id: request.rpid.clone(),
        transaction_id: transaction_id.to_string(),
        client_data_hash: request.client_data_hash.clone(),
        allowed_credentials: request.allowed_credentials.clone(),
        user_verification: request.user_verification.clone(),
    };
    
    util::message(&format!("Assertion request data - RP ID: {}, Client data hash: {} bytes, Allowed credentials: {}", 
        request.rpid, request.client_data_hash.len(), request.allowed_credentials.len()));
    
    match serde_json::to_string(&passkey_request) {
        Ok(request_json) => {
            util::message(&format!("Sending assertion request: {}", request_json));
            crate::ipc::send_passkey_request(RequestType::Assertion, request_json, &request.rpid)
        },
        Err(e) => {
            util::message(&format!("ERROR: Failed to serialize assertion request: {}", e));
            None
        }
    }
}

/// Creates a WebAuthn get assertion response from Bitwarden's assertion response
pub unsafe fn create_get_assertion_response(
    credential_id: Vec<u8>,
    authenticator_data: Vec<u8>,
    signature: Vec<u8>,
    user_handle: Vec<u8>
) -> std::result::Result<*mut ExperimentalWebAuthnPluginOperationResponse, HRESULT> {
    // Construct a CTAP2 response with the proper structure
    
    // Create CTAP2 GetAssertion response map according to CTAP2 specification
    let mut cbor_response: Vec<(ciborium::Value, ciborium::Value)> = Vec::new();
    
    // [1] credential (optional) - Always include credential descriptor
    let credential_map = vec![
        (ciborium::Value::Text("id".to_string()), ciborium::Value::Bytes(credential_id.clone())),
        (ciborium::Value::Text("type".to_string()), ciborium::Value::Text("public-key".to_string())),
    ];
    cbor_response.push((
        ciborium::Value::Integer(1.into()), 
        ciborium::Value::Map(credential_map)
    ));
    
    // [2] authenticatorData (required)
    cbor_response.push((
        ciborium::Value::Integer(2.into()), 
        ciborium::Value::Bytes(authenticator_data)
    ));
    
    // [3] signature (required)
    cbor_response.push((
        ciborium::Value::Integer(3.into()), 
        ciborium::Value::Bytes(signature)
    ));
    
    // [4] user (optional) - include if user handle is provided
    if !user_handle.is_empty() {
        let user_map = vec![
            (ciborium::Value::Text("id".to_string()), ciborium::Value::Bytes(user_handle)),
        ];
        cbor_response.push((
            ciborium::Value::Integer(4.into()), 
            ciborium::Value::Map(user_map)
        ));
    }
    
    let cbor_value = ciborium::Value::Map(cbor_response);
    
    // Encode to CBOR with error handling
    let mut cbor_data = Vec::new();
    if let Err(e) = ciborium::ser::into_writer(&cbor_value, &mut cbor_data) {
        util::message(&format!("ERROR: Failed to encode CBOR assertion response: {:?}", e));
        return Err(HRESULT(-1));
    }
    
    let response_len = cbor_data.len();
    
    // Allocate memory for the response data
    let layout = Layout::from_size_align(response_len, 1).map_err(|_| HRESULT(-1))?;
    let response_ptr = alloc(layout);
    if response_ptr.is_null() {
        return Err(HRESULT(-1));
    }
    
    // Copy response data
    ptr::copy_nonoverlapping(cbor_data.as_ptr(), response_ptr, response_len);
    
    // Allocate memory for the response structure
    let response_layout = Layout::new::<ExperimentalWebAuthnPluginOperationResponse>();
    let operation_response_ptr = alloc(response_layout) as *mut ExperimentalWebAuthnPluginOperationResponse;
    if operation_response_ptr.is_null() {
        return Err(HRESULT(-1));
    }
    
    // Initialize the response
    ptr::write(operation_response_ptr, ExperimentalWebAuthnPluginOperationResponse {
        encoded_response_byte_count: response_len as u32,
        encoded_response_pointer: response_ptr,
    });
    
    Ok(operation_response_ptr)
}