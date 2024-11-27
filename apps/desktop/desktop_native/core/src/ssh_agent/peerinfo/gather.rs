use sysinfo::{Pid, System};

use super::{application_info, models::PeerInfo};

pub fn get_peer_info(peer_pid: u32) -> Result<PeerInfo, String> {
    let s = System::new_all();
    if let Some(process) = s.process(Pid::from_u32(peer_pid)) {
        let peer_process_name = match process.name().to_str() {
            Some(name) => name.to_string(),
            None => {
                return Err("Failed to get process name".to_string());
            }
        };

        let application_info = application_info::get_info(peer_pid as usize).map_err(|e| e.to_string())?;

        return Ok(PeerInfo::new(
            peer_pid,
            process.pid().as_u32(),
            peer_process_name,
            application_info,
        ));
    }

    Err("Failed to get process".to_string())
}
