use std::{fs, process::Command, sync::Arc};

use ssh_agent::{agent::{ui_requester::{UiRequestMessage, UiRequester}, BitwardenDesktopAgent}, memory::UnlockedSshItem, protocol::types::{KeyPair, PrivateKey}, transport::unix_listener_stream::UnixListenerStream};
use tokio::{sync::{broadcast, mpsc, Mutex}, task};
use tracing::info;

const TEST_RUN_DIR: &str = "/home/quexten/test_run/";

#[tokio::main]
async fn main() {
    // set up tracing to stdout
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_thread_ids(true)
        .with_thread_names(true)
        .init();

    fs::remove_dir_all(TEST_RUN_DIR).unwrap_or(());
    // Prepare test run directory 
    fs::create_dir_all(TEST_RUN_DIR).unwrap();

    let config = format!("Port 2222
HostKey {}/ssh_host_rsa_key
HostKey {}/ssh_host_ecdsa_key
HostKey {}/ssh_host_ed25519_key
AuthorizedKeysFile  {}/authorized_keys
", TEST_RUN_DIR, TEST_RUN_DIR, TEST_RUN_DIR, TEST_RUN_DIR);
    fs::write(format!("{}/sshd_config", TEST_RUN_DIR), config).unwrap();

    let keys = make_keys();

    // Start ssh server
    std::thread::spawn(move || {
        Command::new("/usr/bin/sshd")
            .args(&["-f", &format!("{}/sshd_config", TEST_RUN_DIR), "-D", "-e"])
            .status()
            .expect("failed to execute process");
    });

    let ui_requester = mock_channels();
    let desktop_agent = BitwardenDesktopAgent::new(ui_requester);
    desktop_agent.set_keys(keys);

    task::spawn(async move {
        println!("Starting SSH Agent V2 socket...");
        info!(target: "ssh-agent", "Listening on {}", format!("{}/ssh-agent.sock", TEST_RUN_DIR));
        UnixListenerStream::listen(format!("{}/ssh-agent.sock", TEST_RUN_DIR), desktop_agent)
            .await
            .unwrap();
    });

    // run ssh-add -L
    Command::new("ssh-add")
        .env("SSH_AUTH_SOCK", format!("{}/ssh-agent.sock", TEST_RUN_DIR))
        .args(&["-L"])
        .status()
        .expect("failed to execute process");

    // run ssh
    Command::new("ssh")
        .env("SSH_AUTH_SOCK", format!("{}/ssh-agent.sock", TEST_RUN_DIR))
        .args(&[
            "-o",
            "StrictHostKeyChecking=no",
            "-o",
            "UserKnownHostsFile=/dev/null",
            "-p",
            "2222",
            "localhost",
            "echo",
            "Hello, world!",
        ])
        .status()
        .expect("failed to execute process");

    // Cleanup
    fs::remove_dir_all(TEST_RUN_DIR).unwrap();
    std::process::exit(0);
}

fn make_keys() -> Vec<UnlockedSshItem> {
    Command::new("ssh-keygen")
        .args(&[
            "-f",
            &format!("{}/ssh_host_rsa_key", TEST_RUN_DIR),
            "-N",
            "",
            "-t",
            "rsa",
        ])
        .status()
        .expect("failed to execute process");
    Command::new("ssh-keygen")
        .args(&[
            "-f",
            &format!("{}/ssh_host_ecdsa_key", TEST_RUN_DIR),
            "-N",
            "",
            "-t",
            "ecdsa",
        ])
        .status()
        .expect("failed to execute process");
    Command::new("ssh-keygen")
        .args(&[
            "-f",
            &format!("{}/ssh_host_ed25519_key", TEST_RUN_DIR),
            "-N",
            "",
            "-t",
            "ed25519",
        ])
        .status()
        .expect("failed to execute process");
    // // Make user key
    Command::new("ssh-keygen")
        .args(&[
            "-f",
            &format!("{}/id_ed25519", TEST_RUN_DIR),
            "-N",
            "",
            "-t",
            "ed25519",
        ])
        .status()
        .expect("failed to execute process");
    Command::new("ssh-keygen")
        .args(&[
            "-f",
            &format!("{}/ssh_rsa", TEST_RUN_DIR),
            "-N",
            "",
            "-t",
            "rsa",
        ])
        .status()
        .expect("failed to execute process");
    let pubkey1 = fs::read_to_string(format!("{}/id_ed25519.pub", TEST_RUN_DIR)).unwrap();
    let pubkey2 = fs::read_to_string(format!("{}/ssh_rsa.pub", TEST_RUN_DIR)).unwrap();
    fs::write(
        format!("{}/authorized_keys", TEST_RUN_DIR),
        format!("{}{}", pubkey1, pubkey2),
    )
    .unwrap();
    let privkey1 = fs::read_to_string(format!("{}/id_ed25519", TEST_RUN_DIR)).unwrap();
    let key1 = KeyPair::new(PrivateKey::try_from(privkey1).unwrap(), "ed25519-key".to_string());
    let privkey2 = fs::read_to_string(format!("{}/ssh_rsa", TEST_RUN_DIR)).unwrap();
    let key2 = KeyPair::new(PrivateKey::try_from(privkey2).unwrap(), "rsa-key".to_string());
    let unlocked_items = vec![
        UnlockedSshItem::new(key1, "cipher1".to_string()),
        UnlockedSshItem::new(key2, "cipher2".to_string()),
    ];
    unlocked_items
}

fn mock_channels() -> UiRequester {
    let (show_ui_request_tx, mut show_ui_request_rx) = mpsc::channel::<UiRequestMessage>(10);

    // Create mock broadcast channel for responses
    let (response_tx, response_rx) = broadcast::channel::<(u32, bool)>(10);
    let get_ui_response_rx = Arc::new(Mutex::new(response_rx));

    // Spawn a task to automatically send back "true" responses
    let response_tx_clone = response_tx.clone();
    let _ = task::spawn(async move {
        while let Some(req) = show_ui_request_rx.recv().await {
            info!("Mock UI requester received request: {:?}", req);
            let _ = response_tx_clone.send((req.id(), true));
        }
        info!("Mock UI requester task ending");
    });

    UiRequester::new(show_ui_request_tx, get_ui_response_rx)
}