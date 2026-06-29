#![allow(unused)]
use crate::logger;
use interprocess::local_socket::{tokio::prelude::*, GenericNamespaced, ListenerOptions};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, WriteHalf};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::model::agent::claude::{
    CcDirective, CcHookData, CcHookEvent, CcPermBehavior, CcPermReqResp, CcPreToolUseResp,
    HookAction, HookRequest, HookResponse,
};

const TAG: &str = "Hook";

type ConnMap = Mutex<HashMap<String, WriteHalf<LocalSocketStream>>>;
static CONN_MAP: OnceLock<ConnMap> = OnceLock::new();

fn get_conn_map() -> &'static ConnMap {
    CONN_MAP.get_or_init(|| Mutex::new(HashMap::new()))
}

type HookEventMap = Mutex<HashMap<String, CcHookEvent>>;
static HOOK_EVENT_MAP: OnceLock<HookEventMap> = OnceLock::new();

fn get_hook_event_map() -> &'static HookEventMap {
    HOOK_EVENT_MAP.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct IpcRequest {
    name: String,
    payload: serde_json::Value,
}

pub async fn start_interprocess_server(window: tauri::WebviewWindow) {
    let ipc_name = "灯灯侑侑天下第一";
    let name = match ipc_name.to_ns_name::<GenericNamespaced>() {
        Ok(n) => n,
        Err(e) => {
            logger::error(TAG, &format!("IPC 名称注册失败: {}", e));
            return;
        }
    };
    let opts = ListenerOptions::new().name(name);
    let listener = match opts.create_tokio() {
        Ok(l) => l,
        Err(e) => {
            logger::error(TAG, &e.to_string());
            return;
        }
    };

    logger::info(TAG, &format!("IPC server started on '{}'", ipc_name));

    loop {
        let conn = match listener.accept().await {
            Ok(c) => c,
            Err(e) => {
                logger::error(TAG, &e.to_string());
                continue;
            }
        };
        let win = window.clone();
        tokio::spawn(async move {
            let (reader, writer) = tokio::io::split(conn);
            let mut reader = BufReader::new(reader);
            let mut line = String::new();

            if let Err(e) = reader.read_line(&mut line).await {
                logger::error(TAG, &format!("读取失败: {}", e));
                return;
            }

            match serde_json::from_str::<IpcRequest>(&line) {
                Ok(request) => {
                    let uuid = Uuid::new_v4().to_string();
                    logger::debug(
                        TAG,
                        &format!("收到请求: name={}, uuid={}", request.name, uuid),
                    );

                    match request.name.as_str() {
                        "claude" => {
                            handle_claude_hook(&uuid, request.payload, writer, &win).await;
                        }
                        _ => {
                            logger::warn(TAG, &format!("未知 agent: {}", request.name));
                        }
                    }
                }
                Err(e) => {
                    logger::error(TAG, &format!("JSON 解析失败: {}", e));
                }
            }
        });
    }
}

async fn handle_claude_hook(
    uuid: &str,
    payload: serde_json::Value,
    writer: WriteHalf<LocalSocketStream>,
    win: &tauri::WebviewWindow,
) {
    match serde_json::from_value::<CcHookData>(payload.clone()) {
        Ok(hook_data) => {
            let hook_event = hook_data.hook_event_name.clone();
            get_conn_map().lock().await.insert(uuid.to_string(), writer);
            get_hook_event_map()
                .lock()
                .await
                .insert(uuid.to_string(), hook_event);
            let hook_request = hook_data.to_request(uuid.to_string());

            logger::info(
                TAG,
                &format!(
                    "Claude hook: event={:?}, tool={:?}, uuid={}",
                    hook_request.hook_event, hook_request.tool_name, uuid
                ),
            );

            if let Err(e) = win.emit("hook_request", hook_request) {
                logger::error(TAG, &format!("发送事件失败: {}", e));
            }
        }
        Err(e) => {
            logger::warn(TAG, &format!("CcHookData 解析失败，尝试旧版: {}", e));
            handle_claude_hook_legacy(uuid, payload, writer, win).await;
        }
    }
}

async fn handle_claude_hook_legacy(
    uuid: &str,
    payload: serde_json::Value,
    writer: WriteHalf<LocalSocketStream>,
    win: &tauri::WebviewWindow,
) {
    use crate::model::agent::claude::Claude;

    match serde_json::from_value::<Claude>(payload) {
        Ok(claude) => {
            let hook_event_str = claude.hook_event_name.clone();
            let tool_name = claude.tool_name.clone();

            if let Some(hook_data) = claude.to_hook_data() {
                let hook_event = hook_data.hook_event_name.clone();
                get_conn_map().lock().await.insert(uuid.to_string(), writer);
                get_hook_event_map()
                    .lock()
                    .await
                    .insert(uuid.to_string(), hook_event);
                let hook_request = hook_data.to_request(uuid.to_string());

                logger::info(
                    TAG,
                    &format!(
                        "Claude hook (legacy): event={}, tool={}, uuid={}",
                        hook_event_str, tool_name, uuid
                    ),
                );

                if let Err(e) = win.emit("hook_request", hook_request) {
                    logger::error(TAG, &format!("发送事件失败: {}", e));
                }
            }
        }
        Err(e) => {
            logger::error(TAG, &format!("Claude 数据解析失败: {}", e));
        }
    }
}

async fn handle_request(uuid: &str, result: serde_json::Value) {
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
            logger::error(TAG, &format!("发送响应失败: {}", e));
        }
    } else {
        logger::warn(TAG, &format!("UUID 未找到: {}", uuid));
    }
}

fn build_directive(action: HookAction, hook_event: &CcHookEvent) -> Option<CcDirective> {
    match action {
        HookAction::Allow => match hook_event {
            CcHookEvent::PreToolUse => Some(CcDirective::PreToolUse(CcPreToolUseResp {
                permission_decision: Some(CcPermBehavior::Allow),
                permission_decision_reason: None,
                updated_input: None,
                additional_context: None,
            })),
            CcHookEvent::PermissionRequest => Some(CcDirective::PermissionRequest(CcPermReqResp {
                behavior: CcPermBehavior::Allow,
                updated_input: None,
                updated_permissions: None,
                message: None,
                interrupt: None,
            })),
            _ => None,
        },
        HookAction::Deny => match hook_event {
            CcHookEvent::PreToolUse => Some(CcDirective::PreToolUse(CcPreToolUseResp {
                permission_decision: Some(CcPermBehavior::Deny),
                permission_decision_reason: Some("Denied by user".to_string()),
                updated_input: None,
                additional_context: None,
            })),
            CcHookEvent::PermissionRequest => Some(CcDirective::PermissionRequest(CcPermReqResp {
                behavior: CcPermBehavior::Deny,
                updated_input: None,
                updated_permissions: None,
                message: Some("Denied by user".to_string()),
                interrupt: Some(false),
            })),
            _ => None,
        },
        HookAction::Answer { answer: a } => Some(CcDirective::PermissionRequest(CcPermReqResp {
            behavior: CcPermBehavior::Allow,
            updated_input: Some(a),
            updated_permissions: None,
            message: None,
            interrupt: None,
        })),
        HookAction::Custom { directive } => Some(directive),
    }
}

fn format_directive_for_claude(directive: &CcDirective) -> serde_json::Value {
    match directive {
        CcDirective::PreToolUse(resp) => {
            serde_json::json!({
                "continue": true,
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": resp.permission_decision,
                    "permissionDecisionReason": resp.permission_decision_reason,
                    "updatedInput": resp.updated_input,
                    "additionalContext": resp.additional_context
                }
            })
        }
        CcDirective::PermissionRequest(resp) => {
            serde_json::json!({
                "continue": true,
                "hookSpecificOutput": {
                    "hookEventName": "PermissionRequest",
                    "decision": {
                        "behavior": resp.behavior,
                        "updatedInput": resp.updated_input,
                        "updatedPermissions": resp.updated_permissions,
                        "message": resp.message,
                        "interrupt": resp.interrupt
                    }
                }
            })
        }
        CcDirective::Stop(resp) => {
            serde_json::json!({
                "decision": resp.decision,
                "reason": resp.reason
            })
        }
    }
}

#[tauri::command]
pub async fn respond_to_hook(uuid: String, action: HookAction) -> Result<(), String> {
    logger::info(
        TAG,
        &format!("收到响应: uuid={}, action={:?}", uuid, action),
    );

    let hook_event = get_hook_event_map()
        .lock()
        .await
        .remove(&uuid)
        .unwrap_or(CcHookEvent::PreToolUse);

    let directive = build_directive(action, &hook_event);

    if let Some(directive) = directive {
        let response_json = format_directive_for_claude(&directive);
        handle_request(&uuid, response_json).await;
    } else {
        handle_request(&uuid, serde_json::json!({})).await;
    }

    Ok(())
}
