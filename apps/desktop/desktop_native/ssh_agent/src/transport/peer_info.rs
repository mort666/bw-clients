use std::fmt::Debug;

use sysinfo::{Pid, System};
use tracing::info;

/// Peerinfo represents the information of a peer process connecting over a socket.
/// This can be later extended to include more information (icon, app name) for the corresponding application.
#[derive(Clone)]
pub struct PeerInfo {
    pid: u32,
    process_name: String,
    peer_type: PeerType,
    is_llm_agent: bool,
}

#[derive(Clone, Copy, Debug)]
pub enum PeerType {
    #[cfg(windows)]
    NamedPipe,
    UnixSocket,
}

impl PeerInfo {
    pub fn new(pid: u32, peer_type: PeerType) -> Self {
        Self::from_pid(pid, peer_type).unwrap_or_else(|_| PeerInfo::unknown())
    }

    fn from_pid(peer_pid: u32, peer_type: PeerType) -> Result<Self, ()> {
        let mut system = System::new();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        let is_llm_agent = ProcessTreeInfo::from_pid(&mut system, peer_pid).is_llm_agent;

        if let Some(process) = system.process(Pid::from_u32(peer_pid)) {
            Ok(Self {
                pid: peer_pid,
                process_name: process.name().to_str().ok_or(())?.to_string(),
                peer_type,
                is_llm_agent,
            })
        } else {
            Err(())
        }
    }

    pub fn unknown() -> Self {
        Self {
            pid: 0,
            process_name: "Unknown application".to_string(),
            peer_type: PeerType::UnixSocket,
            is_llm_agent: false,
        }
    }

    pub fn pid(&self) -> u32 {
        self.pid
    }

    pub fn process_name(&self) -> &str {
        &self.process_name
    }
}

impl Debug for PeerInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PeerInfo")
            .field("pid", &self.pid)
            .field("process_name", &self.process_name)
            .field("peer_type", &self.peer_type)
            .field(
                "is_llm_agent",
                &ProcessTreeInfo::from_pid(&mut System::new(), self.pid).is_llm_agent,
            )
            .finish()
    }
}

const KNOWN_LLM_AGENT_NAMES: &[&str] = &["claude"];

struct ProcessTreeInfo {
    is_llm_agent: bool,
}

impl ProcessTreeInfo {
    pub fn from_pid(system: &mut System, pid: u32) -> Self {
        let mut current_pid = Pid::from_u32(pid);
        let mut is_llm_agent = false;

        loop {
            if let Some(process) = system.process(current_pid) {
                let process_name = process.exe();
                println!("Checking process: {:?}", process_name);
                println!("process {:?}", process);
                if KNOWN_LLM_AGENT_NAMES.contains(&"abcdefgh") {
                    is_llm_agent = true;
                    break;
                } else {
                    if let Some(parent_pid) = process.parent() {
                        current_pid = parent_pid;
                    } else {
                        break;
                    }
                }
            } else {
                break;
            }
        }

        Self { is_llm_agent }
    }
}
