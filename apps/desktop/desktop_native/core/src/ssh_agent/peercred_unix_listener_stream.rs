use futures::Stream;
use std::io;
use std::pin::Pin;
use std::task::{Context, Poll};
use sysinfo::{Pid, System};
use tokio::net::{UnixListener, UnixStream};

#[derive(Debug)]
pub struct PeercredUnixListenerStream {
    inner: UnixListener,
}

impl PeercredUnixListenerStream {
    pub fn new(listener: UnixListener) -> Self {
        Self { inner: listener }
    }

    pub fn into_inner(self) -> UnixListener {
        self.inner
    }
}

impl Stream for PeercredUnixListenerStream {
    type Item = io::Result<UnixStream>;

    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<io::Result<UnixStream>>> {
        match self.inner.poll_accept(cx) {
            Poll::Ready(Ok((stream, _))) => {
                println!("{:?}", stream.peer_cred());
                println!("{:?}", stream.peer_cred().unwrap().pid());
                let peer = stream.peer_cred().unwrap();
                let s = System::new_all();
                if let Some(process) = s.process(Pid::from_u32(peer.pid().unwrap() as u32)) {
                    println!("name {:?}", process.name());
                    println!("cmd {:?}", process.cmd());
                }

                Poll::Ready(Some(Ok(stream)))
            }
            Poll::Ready(Err(err)) => Poll::Ready(Some(Err(err))),
            Poll::Pending => Poll::Pending,
        }
    }
}

impl AsRef<UnixListener> for PeercredUnixListenerStream {
    fn as_ref(&self) -> &UnixListener {
        &self.inner
    }
}

impl AsMut<UnixListener> for PeercredUnixListenerStream {
    fn as_mut(&mut self) -> &mut UnixListener {
        &mut self.inner
    }
}
