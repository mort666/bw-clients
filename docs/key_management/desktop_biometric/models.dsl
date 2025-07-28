!element clients.desktop {
  biometric = component "Biometric Authentication" {
    description "Handles biometric authentication for the Bitwarden desktop application."
  }

  password = component "OS Password Management Native Module" {
    description "CRUD operations on keys-values stored by the OS."
    technology "rust module"
  }

  ipc = component "IPC" {
    description "Inter-process communication between the desktop application and the browser extension."
    technology "Sockets"
  }
}

os_secure_storage = softwareSystem "OS Secure Storage" {
  tags "External"
  description "The operating system's secure storage for sensitive data, such as Windows Credential Locker or macOS Keychain."
}

os_user_verification = softwareSystem "OS User Verification" {
  tags "External"
  description "The operating system's user verification system, such as Windows Hello or macOS Touch ID."
}

windows_hello_signer = softwareSystem "Windows Hello Signer" {
  tags "External" "Windows-Biometric"
  description "A Windows Hello signer that can be used to sign requests for the Bitwarden desktop application."
}

clients.browser_extension -> clients.desktop.ipc "Connects to IPC to request biometric authentication"
clients.desktop.ipc -> clients.desktop.biometric "Relays biometric authentication requests to"

clients.desktop.biometric -> clients.desktop.password "Read/Write user keys" "Napi Rust FFI"
clients.desktop.password -> os_secure_storage "CRUD operations on keys stored in the OS secure storage"
clients.desktop.biometric -> os_user_verification "Requests user verification for biometric authentication"
