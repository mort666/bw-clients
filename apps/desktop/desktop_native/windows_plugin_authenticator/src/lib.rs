#![cfg(target_os = "windows")]
#![allow(non_snake_case)]
#![allow(non_camel_case_types)]

use std::ffi::c_uchar;
use std::ffi::c_ulong;
use std::ptr;
use std::{thread, time::Duration};
use util::WindowsString;
use webauthn::*;
use windows::Win32::Foundation::*;
use windows::Win32::System::Com::*;
use windows::Win32::System::LibraryLoader::*;
use windows_core::*;

mod pluginauthenticator;
mod util;
mod webauthn;

const AUTHENTICATOR_NAME: &str = "Bitwarden Desktop Authenticator";
//const AAGUID: &str = "d548826e-79b4-db40-a3d8-11116f7e8349";
const CLSID: &str = "0f7dc5d9-69ce-4652-8572-6877fd695062";
const RPID: &str = "bitwarden.com";

/// Handles initialization and registration for the Bitwarden desktop app as a
/// plugin authenticator with Windows.
/// For now, also adds the authenticator
pub fn register() -> std::result::Result<(), String> {
    util::message(String::from("register() called"));

    util::message(String::from("About to call initialize_com_library()"));
    let r = initialize_com_library();
    util::message(format!("initialized the com library: {:?}", r));

    util::message(String::from("About to call register_com_library()"));
    let r = register_com_library();
    util::message(format!("registered the com library: {:?}", r));

    util::message(String::from("About to call add_authenticator()"));
    let r = add_authenticator();
    util::message(format!("added the authenticator: {:?}", r));

    util::message(String::from("sleeping for 20 seconds..."));
    thread::sleep(Duration::from_millis(20000));
    util::message(String::from("sleeping done"));

    // ---------------------------------------
    // ----- *** add test credential *** -----
    // ---------------------------------------

    // Style 1, currently used: mem::forget
    let mut credential_id_string = String::from("32");
    let credential_id_byte_count = credential_id_string.as_bytes().len() as c_ulong;
    let credential_id_pointer: *mut c_uchar = credential_id_string.as_mut_ptr();
    std::mem::forget(credential_id_string);

    // Style 2, experimental: Box::leak
    // Additionally, might need to Pin (same for style 1)
    //
    // let credential_id_string = String::from("32");
    // let credential_id_byte_count = credential_id_string.as_bytes().len() as c_ulong;
    // let credential_id_box = Box::new(credential_id_string);
    // let credential_id_pointer: *mut c_uchar = credential_id_box.leak().as_mut_ptr();

    let mut rpid_string = String::from("webauthn.io");
    let mut rpid_vec: Vec<u16> = rpid_string.encode_utf16().collect();
    rpid_vec.push(0);
    let rpid: *mut u16 = rpid_vec.as_mut_ptr();
    std::mem::forget(rpid_string);
    std::mem::forget(rpid_vec);

    let mut rp_friendly_name_string = String::from("WebAuthn Website");
    let mut rp_friendly_name_vec: Vec<u16> = rp_friendly_name_string.encode_utf16().collect();
    rp_friendly_name_vec.push(0);
    let rp_friendly_name: *mut u16 = rp_friendly_name_vec.as_mut_ptr();
    std::mem::forget(rp_friendly_name_string);
    std::mem::forget(rp_friendly_name_vec);

    let mut user_id_string = String::from("14");
    let user_id_byte_count = user_id_string.as_bytes().len() as c_ulong;
    let user_id_pointer: *mut c_uchar = user_id_string.as_mut_ptr();
    std::mem::forget(user_id_string);

    let mut user_name_string = String::from("webauthn.io username");
    let mut user_name_vec: Vec<u16> = user_name_string.encode_utf16().collect();
    user_name_vec.push(0);
    let user_name: *mut u16 = user_name_vec.as_mut_ptr();
    std::mem::forget(user_name_string);
    std::mem::forget(user_name_vec);

    let mut user_display_name_string = String::from("webauthn.io display name");
    let mut user_display_name_vec: Vec<u16> = user_display_name_string.encode_utf16().collect();
    user_display_name_vec.push(0);
    let user_display_name: *mut u16 = user_display_name_vec.as_mut_ptr();
    std::mem::forget(user_display_name_string);
    std::mem::forget(user_display_name_vec);

    let mut credential_details = ExperimentalWebAuthnPluginCredentialDetails {
        credential_id_byte_count,
        credential_id_pointer,
        rpid,
        rp_friendly_name,
        user_id_byte_count,
        user_id_pointer,
        user_name,
        user_display_name,
    };
    let credential_details_ptr: *mut ExperimentalWebAuthnPluginCredentialDetails =
        &mut credential_details;
    std::mem::forget(credential_details);

    let mut clsid_string = String::from(format!("{{{}}}", CLSID));
    let mut clsid_vec: Vec<u16> = clsid_string.encode_utf16().collect();
    clsid_vec.push(0);
    let plugin_clsid: *mut u16 = clsid_vec.as_mut_ptr();
    std::mem::forget(clsid_string);
    std::mem::forget(clsid_vec);

    let mut credentials: Vec<*mut ExperimentalWebAuthnPluginCredentialDetails> =
        vec![credential_details_ptr];
    let credential_count: c_ulong = credentials.len() as c_ulong;
    let credentials_ptr: *mut *mut ExperimentalWebAuthnPluginCredentialDetails =
        credentials.as_mut_ptr();
    std::mem::forget(credentials);

    let mut credentials_details_list = ExperimentalWebAuthnPluginCredentialDetailsList {
        plugin_clsid,
        credential_count,
        credentials: credentials_ptr,
    };
    let credentials_details_list_ptr: *mut ExperimentalWebAuthnPluginCredentialDetailsList =
        &mut credentials_details_list;
    std::mem::forget(credentials_details_list);

    util::message(format!("about to link the fn pointer for add credentials"));

    let result = unsafe {
        delay_load::<EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentialsFnDeclaration>(
            s!("webauthn.dll"),
            s!("EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentials"),
        )
    };

    util::message(format!("about to call add credentials"));

    let result = match result {
        Some(api) => {
            let result = unsafe { api(credentials_details_list_ptr) };

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
    };

    util::message(format!("add credentials attempt: {:?}", result));

    // std::mem::forget(credential_id);
    // let mut test_credential = ExperimentalWebAuthnPluginCredentialDetails::create(
    //     String::from("32"),
    //     String::from("webauthn.io"),
    //     String::from("WebAuthn Website"),
    //     String::from("14"),
    //     String::from("web user name"),
    //     String::from("web user display name"),
    // );
    // let test_credential_ptr: *mut ExperimentalWebAuthnPluginCredentialDetails = &mut test_credential;
    // //std::mem::forget(test_credential);
    // let mut test_credential_list: Vec<*mut ExperimentalWebAuthnPluginCredentialDetails> = vec![test_credential_ptr];
    // let test_credential_list_ptr: *mut *mut ExperimentalWebAuthnPluginCredentialDetails = test_credential_list.as_mut_ptr();
    // let pluginclsid = String::from(CLSID).into_win_utf16().0;

    // let credentials = ExperimentalWebAuthnPluginCredentialDetailsList {
    //     plugin_clsid: pluginclsid,
    //     credential_count: 1,
    //     credentials: test_credential_list_ptr,
    // };

    // let r = add_credentials(credentials);
    // util::message(format!("added the credentials: {:?}", r));

    Ok(())
}

// -----
#[repr(C)]
pub struct ExperimentalWebAuthnPluginCredentialDetails {
    pub credential_id_byte_count: c_ulong,   // DWORD cbCredentialId
    pub credential_id_pointer: *mut c_uchar, // PBYTE pbCredentialId
    pub rpid: *mut u16,                      // PWSTR pwszRpId
    pub rp_friendly_name: *mut u16,          // PWSTR pwszRpName
    pub user_id_byte_count: u32,             // DWORD cbUserId
    pub user_id_pointer: *mut c_uchar,       // PBYTE pbUserId
    pub user_name: *mut u16,                 // PWSTR pwszUserName
    pub user_display_name: *mut u16,         // PWSTR pwszUserDisplayName
}
#[repr(C)]
pub struct ExperimentalWebAuthnPluginCredentialDetailsList {
    pub plugin_clsid: *mut u16,    // PWSTR pwszPluginClsId
    pub credential_count: c_ulong, // DWORD cCredentialDetails
    pub credentials: *mut *mut ExperimentalWebAuthnPluginCredentialDetails, // CredentialDetailsPtr *pCredentialDetails
}
type EXPERIMENTAL_WebAuthNPluginAuthenticatorAddCredentialsFnDeclaration =
    unsafe extern "cdecl" fn(
        pCredentialDetailsList: *mut ExperimentalWebAuthnPluginCredentialDetailsList,
    ) -> HRESULT;
// -----

/// Initializes the COM library for use on the calling thread,
/// and registers + sets the security values.
fn initialize_com_library() -> std::result::Result<(), String> {
    let result = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };

    if result.is_err() {
        return Err(format!(
            "Error: couldn't initialize the COM library\n{}",
            result.message()
        ));
    }

    match unsafe {
        CoInitializeSecurity(
            None,
            -1,
            None,
            None,
            RPC_C_AUTHN_LEVEL_DEFAULT,
            RPC_C_IMP_LEVEL_IMPERSONATE,
            None,
            EOAC_NONE,
            None,
        )
    } {
        Ok(_) => Ok(()),
        Err(e) => Err(format!(
            "Error: couldn't initialize COM security\n{}",
            e.message()
        )),
    }
}

/// Registers the Bitwarden Plugin Authenticator COM library with Windows.
fn register_com_library() -> std::result::Result<(), String> {
    static FACTORY: windows_core::StaticComObject<pluginauthenticator::Factory> =
        pluginauthenticator::Factory.into_static();
    //let clsid: *const GUID = &GUID::from_u128(0xa98925d161f640de9327dc418fcb2ff4);
    let clsid: *const GUID = &GUID::from_u128(0x0f7dc5d969ce465285726877fd695062);

    match unsafe {
        CoRegisterClassObject(
            clsid,
            FACTORY.as_interface_ref(),
            //FACTORY.as_interface::<pluginauthenticator::EXPERIMENTAL_IPluginAuthenticator>(),
            CLSCTX_LOCAL_SERVER,
            REGCLS_MULTIPLEUSE,
        )
    } {
        Ok(_) => Ok(()),
        Err(e) => Err(format!(
            "Error: couldn't register the COM library\n{}",
            e.message()
        )),
    }
}

/// Adds Bitwarden as a plugin authenticator.
fn add_authenticator() -> std::result::Result<(), String> {
    let authenticator_name: HSTRING = AUTHENTICATOR_NAME.into();
    let authenticator_name_ptr = PCWSTR(authenticator_name.as_ptr()).as_ptr();

    let clsid: HSTRING = format!("{{{}}}", CLSID).into();
    let clsid_ptr = PCWSTR(clsid.as_ptr()).as_ptr();

    let relying_party_id: HSTRING = RPID.into();
    let relying_party_id_ptr = PCWSTR(relying_party_id.as_ptr()).as_ptr();

    // let aaguid: HSTRING = format!("{{{}}}", AAGUID).into();
    // let aaguid_ptr = PCWSTR(aaguid.as_ptr()).as_ptr();

    // Example authenticator info blob
    let cbor_authenticator_info = "A60182684649444F5F325F30684649444F5F325F310282637072666B686D61632D7365637265740350D548826E79B4DB40A3D811116F7E834904A362726BF5627570F5627576F5098168696E7465726E616C0A81A263616C672664747970656A7075626C69632D6B6579";
    let mut authenticator_info_bytes = hex::decode(cbor_authenticator_info).unwrap();

    let add_authenticator_options = webauthn::ExperimentalWebAuthnPluginAddAuthenticatorOptions {
        authenticator_name: authenticator_name_ptr,
        plugin_clsid: clsid_ptr,
        rpid: relying_party_id_ptr,
        light_theme_logo: ptr::null(), // unused by Windows
        dark_theme_logo: ptr::null(),  // unused by Windows
        cbor_authenticator_info_byte_count: authenticator_info_bytes.len() as u32,
        cbor_authenticator_info: authenticator_info_bytes.as_mut_ptr(),
    };

    let plugin_signing_public_key_byte_count: u32 = 0;
    let mut plugin_signing_public_key: c_uchar = 0;
    let plugin_signing_public_key_ptr = &mut plugin_signing_public_key;

    let mut add_response = webauthn::ExperimentalWebAuthnPluginAddAuthenticatorResponse {
        plugin_operation_signing_key_byte_count: plugin_signing_public_key_byte_count,
        plugin_operation_signing_key: plugin_signing_public_key_ptr,
    };
    let mut add_response_ptr: *mut webauthn::ExperimentalWebAuthnPluginAddAuthenticatorResponse =
        &mut add_response;

    let result = unsafe {
        delay_load::<EXPERIMENTAL_WebAuthNPluginAddAuthenticatorFnDeclaration>(
            s!("webauthn.dll"),
            s!("EXPERIMENTAL_WebAuthNPluginAddAuthenticator"),
        )
    };

    match result {
        Some(api) => {
            let result = unsafe { api(&add_authenticator_options, &mut add_response_ptr) };

            if result.is_err() {
                return Err(format!(
                    "Error: Error response from EXPERIMENTAL_WebAuthNPluginAddAuthenticator()\n{}",
                    result.message()
                ));
            }

            Ok(())
        },
        None => {
            Err(String::from("Error: Can't complete add_authenticator(), as the function EXPERIMENTAL_WebAuthNPluginAddAuthenticator can't be found."))
        }
    }
}

type EXPERIMENTAL_WebAuthNPluginAddAuthenticatorFnDeclaration = unsafe extern "cdecl" fn(
    pPluginAddAuthenticatorOptions: *const webauthn::ExperimentalWebAuthnPluginAddAuthenticatorOptions,
    ppPluginAddAuthenticatorResponse: *mut *mut webauthn::ExperimentalWebAuthnPluginAddAuthenticatorResponse,
) -> HRESULT;

unsafe fn delay_load<T>(library: PCSTR, function: PCSTR) -> Option<T> {
    let library = LoadLibraryExA(library, None, LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);

    let Ok(library) = library else {
        return None;
    };

    let address = GetProcAddress(library, function);

    if address.is_some() {
        return Some(std::mem::transmute_copy(&address));
    }

    _ = FreeLibrary(library);

    None
}
