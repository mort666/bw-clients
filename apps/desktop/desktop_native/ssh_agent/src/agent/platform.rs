use homedir::my_home;
use tracing::info;

use crate::{agent::BitwardenDesktopAgent, transport::unix_listener_stream::UnixListenerStream};

pub struct PlatformListener {}

impl PlatformListener {
    pub fn spawn_listeners(agent: BitwardenDesktopAgent) {
        #[cfg(target_os = "linux")]
        {
            Self::spawn_linux_listeners(agent);
        }

        #[cfg(target_os = "macos")]
        {
            Self::spawn_macos_listeners(agent);
        }
    }

    #[cfg(target_os = "linux")]
    fn spawn_linux_listeners(agent: BitwardenDesktopAgent) {
        let ssh_agent_directory = match my_home() {
            Ok(Some(home)) => home,
            _ => {
                info!("Could not determine home directory");
                return;
            }
        };

        let is_flatpak = std::env::var("container") == Ok("flatpak".to_string());
        let path = if !is_flatpak {
            ssh_agent_directory
                .join(".bitwarden-ssh-agent.sock")
                .to_str()
                .expect("Path should be valid")
                .to_owned()
        } else {
            ssh_agent_directory
                .join(".var/app/com.bitwarden.desktop/data/.bitwarden-ssh-agent.sock")
                .to_str()
                .expect("Path should be valid")
                .to_owned()
        };

        tokio::spawn(UnixListenerStream::listen(path, agent));
    }

    #[cfg(target_os = "macos")]
    fn spawn_macos_listeners(agent: BitwardenDesktopAgent) {
        let ssh_agent_directory = match my_home() {
            Ok(Some(home)) => home,
            _ => {
                info!("Could not determine home directory");
                return;
            }
        };

        let path = ssh_agent_directory
            .join(".bitwarden-ssh-agent.sock")
            .to_str()
            .expect("Path should be valid")
            .to_owned();

        tokio::spawn(UnixListenerStream::listen(path, agent));
    }
}
