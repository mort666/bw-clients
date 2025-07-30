!element clients.desktop {
  encrypt_service = component "Encrypt Service" {
    description "Service that handles encryption and decryption of sensitive data in the Bitwarden desktop application."
  }

  biometric_renderer_service = component "Biometric Renderer Service" {
    description "Service that handles biometric authentication for the Bitwarden desktop application."
    technology "Electron"
  }

  biometric_main_service = component "Biometric Main Service" {
    description "Main service for biometric authentication in the Bitwarden desktop application."
    technology "Electron"
  }

  macos_biometric_service = component "MacOS Biometric Service" {
    description "Service that handles MacOS-specific biometric authentication."
    tags "MacOS"
    technology "Electron"
  }

  windows_biometric_service = component "Windows Biometric Service" {
    description "Service that handles Windows-specific biometric authentication."
    tags "Windows"
    technology "Electron"
  }

  linux_biometric_service = component "Linux Biometric Service" {
    description "Service that handles Linux-specific biometric authentication."
    tags "Linux"
    technology "Electron"
  }


  biometric_main_service -> macos_biometric_service "Handles macOS biometric unlock requests" {
    tags "MacOS"
  }

  biometric_main_service -> windows_biometric_service "Handles Windows biometric unlock requests" {
    tags "Windows"
  }

  biometric_main_service -> linux_biometric_service "Handles Linux biometric unlock requests" {
    tags "Linux"
  }
  
  password = component "OS Password Management Native Module" {
    description "CRUD operations on keys-values stored by the OS."
    technology "rust module"
  }

  group ipc {
    ipc_external = component "IPC" {
      description "External IPC for communication with the desktop application."
      technology "Sockets"
    }

    electron_ipc = component "Electron IPC" {
      description "Communication between renderer and main electron processes."
      technology "Electron"
    }
  }

  biometric_renderer_service -> electron_ipc "Requests biometric authentication" {
    tags "MacOS", "Windows", "Linux"
  }

  electron_ipc -> biometric_main_service "Relays biometric authentication requests to" {
    tags "MacOS", "Windows", "Linux"
  }

  linux_biometric_service -> encrypt_service "Encrypts/Decrypts user key with client key half" {
    tags "Linux"
  }

  windows_biometric_service -> encrypt_service "Encrypts/Decrypts user key with client key half" {
    tags "Windows"
  }
}

os_secure_storage = softwareSystem "OS Secure Storage" {
  tags "External"
  description "The operating system's secure storage for sensitive data, such as Windows Credential Locker or macOS Keychain."
}

// windows_hello = softwareSystem "Windows Hello" {
//   tags "External" "windows"
//   description "Windows Hello is a biometric authentication feature in Windows 10 and later that allows users to log in using facial recognition, fingerprint scanning, or a PIN."
// }

// macos_touch_id = softwareSystem "macOS Touch ID" {
//   tags "External" "macos"
//   description "Touch ID is a fingerprint recognition feature on Apple devices that allows users to unlock their devices and make purchases using their fingerprint."
// }

// linux_polkit = softwareSystem "Linux Polkit" {
//   tags "External" "linux"
//   description "Polkit is a system service that allows non-privileged processes to communicate with privileged processes in Linux, often used for user authentication."
// }

os_user_verification = softwareSystem "OS User Verification" {
  tags "External"
  description "The operating system's user verification system, such as Windows Hello or macOS Touch ID."
}


clients.browser_extension -> clients.desktop.ipc_external "Connects to IPC to request biometric authentication" 

clients.desktop.ipc_external -> clients.desktop.biometric_renderer_service "Relays biometric authentication requests to"

clients.desktop.password -> os_secure_storage "CRUD operations on keys stored in the OS secure storage"

clients.desktop.macos_biometric_service -> os_user_verification "Requests user verification for biometric authentication" "Electron Integration with TouchId" {
  tags "MacOS"
}
clients.desktop.linux_biometric_service -> os_user_verification "Requests user verification for biometric authentication" "Custom Polkit policy" {
  tags "Linux"
}
clients.desktop.windows_biometric_service -> os_user_verification "Requests user verification for biometric authentication" "Windows Hello" {
  tags "Windows"
}

clients.desktop.macos_biometric_service -> clients.desktop.password "Saves the user key directly" "" {
  tags "MacOS"
}
clients.desktop.linux_biometric_service -> clients.desktop.password "Saves the user key encrypted with the client key half" "Custom Polkit policy" {
  tags "Linux"
}
clients.desktop.windows_biometric_service -> clients.desktop.password "Saves the user key encrypted with the client key half" "Windows Hello" {
  tags "Windows"
}

