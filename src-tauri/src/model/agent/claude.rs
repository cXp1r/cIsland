#![allow(unused)]
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum CcHookEvent {
    SessionStart,
    SessionEnd,
    UserPromptSubmit,
    PreToolUse,
    PostToolUse,
    PostToolUseFailure,
    PermissionRequest,
    PermissionDenied,
    Notification,
    Stop,
    StopFailure,
    SubagentStart,
    SubagentStop,
    PreCompact,
}

impl CcHookEvent {
    pub fn requires_attention(&self) -> bool {
        matches!(self, Self::PermissionRequest | Self::Notification)
    }

    pub fn is_silent(&self) -> bool {
        matches!(
            self,
            Self::SessionStart
                | Self::SessionEnd
                | Self::PostToolUse
                | Self::PostToolUseFailure
                | Self::Stop
                | Self::StopFailure
                | Self::SubagentStart
                | Self::SubagentStop
                | Self::PreCompact
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CcPermMode {
    Default,
    AcceptEdits,
    Plan,
    DontAsk,
    BypassPermissions,
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CcPermBehavior {
    Allow,
    Deny,
    Ask,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CcPermDest {
    UserSettings,
    ProjectSettings,
    LocalSettings,
    Session,
    CliArg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcHookData {
    pub cwd: String,
    pub hook_event_name: CcHookEvent,
    pub session_id: String,
    #[serde(default)]
    pub transcript_path: Option<String>,
    #[serde(default)]
    pub permission_mode: Option<CcPermMode>,
    #[serde(default)]
    pub agent_id: Option<String>,
    #[serde(default)]
    pub agent_type: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub tool_input: Option<Value>,
    #[serde(default)]
    pub tool_use_id: Option<String>,
    #[serde(default)]
    pub tool_response: Option<Value>,
    #[serde(default)]
    pub permission_suggestions: Option<Vec<CcPermUpdate>>,
    #[serde(default)]
    pub prompt: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub notification_type: Option<String>,
    #[serde(default)]
    pub subtype: Option<String>,
    #[serde(default)]
    pub stop_hook_active: Option<bool>,
    #[serde(default)]
    pub last_assistant_message: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub error_details: Option<String>,
    #[serde(default)]
    pub is_interrupt: Option<bool>,
    #[serde(default)]
    pub terminal_app: Option<String>,
    #[serde(default)]
    pub terminal_session_id: Option<String>,
    #[serde(default)]
    pub terminal_tty: Option<String>,
    #[serde(default)]
    pub terminal_title: Option<String>,
    #[serde(default)]
    pub warp_pane_uuid: Option<String>,
    #[serde(default)]
    pub remote: Option<bool>,
    #[serde(default)]
    pub hook_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcPermUpdate {
    #[serde(rename = "type")]
    pub update_type: String,
    pub destination: CcPermDest,
    #[serde(default)]
    pub rules: Option<Vec<CcPermRule>>,
    #[serde(default)]
    pub behavior: Option<CcPermBehavior>,
    #[serde(default)]
    pub mode: Option<CcPermMode>,
    #[serde(default)]
    pub directories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcPermRule {
    pub tool_name: String,
    #[serde(default)]
    pub rule_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CcDirective {
    PreToolUse(CcPreToolUseResp),
    PermissionRequest(CcPermReqResp),
    Stop(CcStopResp),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcPreToolUseResp {
    #[serde(default)]
    pub permission_decision: Option<CcPermBehavior>,
    #[serde(default)]
    pub permission_decision_reason: Option<String>,
    #[serde(default)]
    pub updated_input: Option<Value>,
    #[serde(default)]
    pub additional_context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcPermReqResp {
    pub behavior: CcPermBehavior,
    #[serde(default)]
    pub updated_input: Option<Value>,
    #[serde(default)]
    pub updated_permissions: Option<Vec<CcPermUpdate>>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub interrupt: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcStopResp {
    pub decision: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookRequest {
    pub uuid: String,
    pub agent_type: String,
    pub session_id: String,
    pub hook_event: CcHookEvent,
    pub tool_name: Option<String>,
    pub tool_input: Option<Value>,
    pub cwd: String,
    pub hook_data: CcHookData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookResponse {
    pub uuid: String,
    pub action: HookAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum HookAction {
    Allow,
    Deny,
    Answer { answer: Value },
    Custom { directive: CcDirective },
}

impl CcHookData {
    pub fn to_request(&self, uuid: String) -> HookRequest {
        HookRequest {
            uuid,
            agent_type: "claude".to_string(),
            session_id: self.session_id.clone(),
            hook_event: self.hook_event_name.clone(),
            tool_name: self.tool_name.clone(),
            tool_input: self.tool_input.clone(),
            cwd: self.cwd.clone(),
            hook_data: self.clone(),
        }
    }

    pub fn workspace_name(&self) -> String {
        std::path::Path::new(&self.cwd)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string()
    }

    pub fn tool_input_preview(&self) -> Option<String> {
        let input = self.tool_input.as_ref()?;
        let obj = input.as_object()?;

        let keys = [
            "command",
            "file_path",
            "pattern",
            "query",
            "prompt",
            "description",
        ];
        for key in keys {
            if let Some(val) = obj.get(key).and_then(|v| v.as_str()) {
                if !val.is_empty() {
                    return Some(truncate(val, 100));
                }
            }
        }

        Some(truncate(&input.to_string(), 100))
    }
}

impl HookRequest {
    pub fn display_tool_name(&self) -> String {
        match self.tool_name.as_deref() {
            Some("Bash") => "终端命令".to_string(),
            Some("Write") => "写入文件".to_string(),
            Some("Edit") => "编辑文件".to_string(),
            Some("Read") => "读取文件".to_string(),
            Some("Glob") => "搜索文件".to_string(),
            Some("Grep") => "搜索内容".to_string(),
            Some("AskUserQuestion") => "回答问题".to_string(),
            Some(name) => name.to_string(),
            None => "未知工具".to_string(),
        }
    }

    pub fn tool_icon(&self) -> &str {
        match self.tool_name.as_deref() {
            Some("Bash") => "🔇",
            Some("Write") | Some("Edit") => "📝",
            Some("Read") => "📄",
            Some("Glob") | Some("Grep") => "🔍",
            Some("AskUserQuestion") => "❓",
            _ => "⚙",
        }
    }
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}…", &s[..max_len - 1])
    }
}

#[derive(Deserialize, Debug)]
pub struct Claude {
    pub session_id: String,
    pub cwd: String,
    pub permission_mode: String,
    pub hook_event_name: String,
    pub tool_name: String,
    pub tool_input: serde_json::Value,
}

impl Claude {
    pub fn to_hook_data(self) -> Option<CcHookData> {
        let hook_event = match self.hook_event_name.as_str() {
            "SessionStart" => CcHookEvent::SessionStart,
            "SessionEnd" => CcHookEvent::SessionEnd,
            "UserPromptSubmit" => CcHookEvent::UserPromptSubmit,
            "PreToolUse" => CcHookEvent::PreToolUse,
            "PostToolUse" => CcHookEvent::PostToolUse,
            "PostToolUseFailure" => CcHookEvent::PostToolUseFailure,
            "PermissionRequest" => CcHookEvent::PermissionRequest,
            "PermissionDenied" => CcHookEvent::PermissionDenied,
            "Notification" => CcHookEvent::Notification,
            "Stop" => CcHookEvent::Stop,
            "StopFailure" => CcHookEvent::StopFailure,
            "SubagentStart" => CcHookEvent::SubagentStart,
            "SubagentStop" => CcHookEvent::SubagentStop,
            "PreCompact" => CcHookEvent::PreCompact,
            _ => return None,
        };

        let permission_mode = match self.permission_mode.as_str() {
            "default" => CcPermMode::Default,
            "acceptEdits" => CcPermMode::AcceptEdits,
            "plan" => CcPermMode::Plan,
            "dontAsk" => CcPermMode::DontAsk,
            "bypassPermissions" => CcPermMode::BypassPermissions,
            "auto" => CcPermMode::Auto,
            _ => CcPermMode::Default,
        };

        Some(CcHookData {
            cwd: self.cwd,
            hook_event_name: hook_event,
            session_id: self.session_id,
            transcript_path: None,
            permission_mode: Some(permission_mode),
            agent_id: None,
            agent_type: None,
            model: None,
            source: None,
            tool_name: Some(self.tool_name),
            tool_input: Some(self.tool_input),
            tool_use_id: None,
            tool_response: None,
            permission_suggestions: None,
            prompt: None,
            message: None,
            title: None,
            notification_type: None,
            subtype: None,
            stop_hook_active: None,
            last_assistant_message: None,
            error: None,
            error_details: None,
            is_interrupt: None,
            terminal_app: None,
            terminal_session_id: None,
            terminal_tty: None,
            terminal_title: None,
            warp_pane_uuid: None,
            remote: None,
            hook_source: None,
        })
    }
}
