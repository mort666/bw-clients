pub mod autofill;
pub mod autostart;
pub mod biometric;
pub mod clipboard;
pub mod error;
pub mod ipc;
pub mod password;
pub mod powermonitor;
pub mod process_isolation;
pub mod ssh_agent;
pub(crate) mod secure_memory;

use zeroizing_alloc::ZeroAlloc;

#[global_allocator]
static ALLOC: ZeroAlloc<std::alloc::System> = ZeroAlloc(std::alloc::System);
