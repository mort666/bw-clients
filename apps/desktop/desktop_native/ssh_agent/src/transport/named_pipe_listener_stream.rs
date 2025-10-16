use futures::Stream;
use std::os::windows::prelude::AsRawHandle as _;
use std::{
    io,
    pin::Pin,
    task::{Context, Poll},
};
use tokio::{
    net::windows::named_pipe::{NamedPipeServer, ServerOptions},
    select,
};
use tracing::{error, info};
use windows::Win32::{Foundation::HANDLE, System::Pipes::GetNamedPipeClientProcessId};

use crate::agent::BitwardenDesktopAgent;
use crate::transport::peer_info::PeerInfo;

#[pin_project::pin_project]
pub struct NamedPipeServerStream {
    rx: tokio::sync::mpsc::Receiver<(NamedPipeServer, PeerInfo)>,
}

impl NamedPipeServerStream {
    pub async fn listen(
        pipe_name: String,
        agent: BitwardenDesktopAgent,
    ) -> Result<NamedPipeServerStream, anyhow::Error> {
        info!("Starting SSH Named Pipe listener");
        let (tx, rx) = tokio::sync::mpsc::channel(16);

        tokio::spawn(async move {
            info!("Creating named pipe server on {}", pipe_name.clone());
            let mut listener = match ServerOptions::new().create(pipe_name.clone()) {
                Ok(pipe) => pipe,
                Err(e) => {
                    error!(error = %e, "Encountered an error creating the first pipe. The system's openssh service must likely be disabled");
                    return;
                }
            };
            let cancellation_token = agent.cancellation_token();
            loop {
                info!("Waiting for connection");
                select! {
                    _ = cancellation_token.cancelled() => {
                        info!("Cancellation token triggered, stopping named pipe server");
                        break;
                    }
                    _ = listener.connect() => {
                        info!("Incoming connection");
                        let handle = HANDLE(listener.as_raw_handle());
                        let mut pid = 0;
                        unsafe {
                            if let Err(e) = GetNamedPipeClientProcessId(handle, &mut pid) {
                                error!(error = %e, pid, "Faile to get named pipe client process id");
                                continue
                            }
                        };

                        let peer_info = PeerInfo::new(pid as u32, crate::transport::peer_info::PeerType::NamedPipe);
                        tx.send((listener, peer_info)).await.unwrap();

                        listener = match ServerOptions::new().create(pipe_name.clone()) {
                            Ok(pipe) => pipe,
                            Err(e) => {
                                error!(error = %e, "Encountered an error creating a new pipe");
                                cancellation_token.cancel();
                                return;
                            }
                        };
                    }
                }
            }
        });

        Ok(NamedPipeServerStream { rx })
    }
}

impl Stream for NamedPipeServerStream {
    type Item = io::Result<(NamedPipeServer, PeerInfo)>;

    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<io::Result<(NamedPipeServer, PeerInfo)>>> {
        let this = self.project();

        this.rx.poll_recv(cx).map(|v| v.map(Ok))
    }
}
