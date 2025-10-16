use std::sync::{atomic::AtomicU32, Arc};

use tokio::sync::Mutex;

use crate::protocol::connection::ConnectionInfo;

const TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60);

#[derive(Clone)]
pub struct UiRequester {
    show_ui_request_tx: tokio::sync::mpsc::Sender<UiRequestMessage>,
    get_ui_response_rx: Arc<Mutex<tokio::sync::broadcast::Receiver<(u32, bool)>>>,
}

static REQUEST_ID_COUNTER: AtomicU32 = AtomicU32::new(0);

#[derive(Clone, Debug)]
pub enum UiRequestMessage {
    ListRequest {
        request_id: u32,
        connection_info: ConnectionInfo,
    },
    AuthRequest {
        request_id: u32,
        connection_info: ConnectionInfo,
        cipher_id: String,
    },
    SignRequest {
        request_id: u32,
        connection_info: ConnectionInfo,
        cipher_id: String,
        namespace: String,
    },
}

impl UiRequestMessage {
    pub fn id(&self) -> u32 {
        match self {
            UiRequestMessage::ListRequest { request_id, .. } => *request_id,
            UiRequestMessage::AuthRequest { request_id, .. } => *request_id,
            UiRequestMessage::SignRequest { request_id, .. } => *request_id,
        }
    }
}

impl UiRequester {
    pub fn new(
        show_ui_request_tx: tokio::sync::mpsc::Sender<UiRequestMessage>,
        get_ui_response_rx: Arc<Mutex<tokio::sync::broadcast::Receiver<(u32, bool)>>>,
    ) -> Self {
        Self {
            show_ui_request_tx,
            get_ui_response_rx,
        }
    }

    pub async fn request_list(&self, connection_info: &ConnectionInfo) -> bool {
        let request_id = REQUEST_ID_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        self.request(UiRequestMessage::ListRequest {
            request_id,
            connection_info: connection_info.clone(),
        })
        .await
    }

    pub async fn request_sign(
        &self,
        connection_info: &ConnectionInfo,
        cipher_id: String,
        namespace: String,
    ) -> bool {
        let request_id = REQUEST_ID_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        self.request(UiRequestMessage::SignRequest {
            request_id,
            connection_info: connection_info.clone(),
            cipher_id,
            namespace,
        })
        .await
    }

    async fn request(&self, request: UiRequestMessage) -> bool {
        let mut rx_channel = self.get_ui_response_rx.lock().await.resubscribe();
        self.show_ui_request_tx
            .send(request.clone())
            .await
            .expect("Should send request to ui");

        tokio::time::timeout(TIMEOUT, async move {
            while let Ok((id, response)) = rx_channel.recv().await {
                if id == request.id() {
                    return response;
                }
            }
            false
        })
        .await
        .unwrap_or(false)
    }
}
