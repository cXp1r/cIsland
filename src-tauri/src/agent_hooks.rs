#![allow(unused)]
use interprocess::local_socket::{
    GenericNamespaced, ListenerOptions,
    tokio::prelude::*,
};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, WriteHalf};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::Mutex;
use uuid::Uuid;
use crate::logger;

//model全部存别的地方了,方便维护
use crate::model::agent::claude::Claude;

const TAG: &str = "IPC";


type ConnMap = Mutex<HashMap<String, WriteHalf<LocalSocketStream>>>;

static CONN_MAP: OnceLock<ConnMap> = OnceLock::new();

fn get_conn_map() -> &'static ConnMap {
    CONN_MAP.get_or_init(|| Mutex::new(HashMap::new()))
}



#[derive(Debug, Deserialize)]
struct Request {
    action: String,
    payload: serde_json::Value,
}


pub async fn start_interprocess_server() {
    let name = match "灯灯侑侑天下第一".to_ns_name::<GenericNamespaced>() {
        Ok(n) => n,
        Err(e) => {
            logger::error(TAG, &format!("这tm有人抢我IPC名字?: {}", e.to_string()));
            return;
        },
    };
    let opts = ListenerOptions::new().name(name);
    let listener = match opts.create_tokio() {
        Ok(l) => l,
        Err(e) => {
            logger::error(TAG, &e.to_string());
            return;
        },
    };

    logger::info(TAG, "IPC server start");

    loop {
        let conn = match listener.accept().await {
            Ok(c) => c,
            Err(e) => {
                logger::error(TAG, &e.to_string());
                continue;
            }
        };

        tokio::spawn(async move {
            let (reader, writer) = tokio::io::split(conn);
            let mut reader = BufReader::new(reader);
            let mut line = String::new();

            if let Err(e) = reader.read_line(&mut line).await {
                eprintln!("Failed to read from client: {}", e);
                return;
            }

            match serde_json::from_str::<Request>(&line) {
                Ok(request) => {
                    let uuid = Uuid::new_v4().to_string();
                    println!("{:?}", request);
                    match request.action.as_str() {
                        "claude" => {
                            match serde_json::from_value::<Claude>(request.payload) {
                                Ok(claude) => {
                                    println!("Claude request — uuid: {}", uuid);
                                    println!("  session_id: {}", claude.session_id);
                                    println!("  cwd: {}", claude.cwd);
                                    println!("  tool_name: {}", claude.tool_name);
                                    println!("  tool_input: {:?}", claude.tool_input);

                                    // Store writer, waiting for respond_command()
                                    get_conn_map().lock().await.insert(uuid.clone(), writer);

                                    // TODO: emit Tauri event to frontend with uuid + claude data
                                    // e.g. app_handle.emit("claude_request", payload)
                                }
                                Err(e) => {
                                    eprintln!("Failed to deserialize Claude payload: {}", e);
                                }
                            }
                        }

                        other => {
                            eprintln!("Unknown action: '{}'", other);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Invalid JSON: {}", e);
                }
            }
        });
    }
}



pub async fn handle_request(uuid: &str, result: serde_json::Value) {
    let mut map = get_conn_map().lock().await;

    if let Some(mut writer) = map.remove(uuid) {
        let response = serde_json::json!({
            "status": "ok",
            "uuid": uuid,
            "result": result,
        });

        let mut response_json = serde_json::to_string(&response).unwrap();
        response_json.push('\n');

        if let Err(e) = writer.write_all(response_json.as_bytes()).await {
            eprintln!("Failed to send response for {}: {}", uuid, e);
        }
    } else {
        eprintln!("UUID not found: {}", uuid);
    }
}


//前端调用这个
#[tauri::command]
pub async fn respond_command(uuid: String, result: serde_json::Value) {
    handle_request(&uuid, result).await;
}