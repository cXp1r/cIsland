#![allow(unused)]
use serde::{Deserialize, Serialize};
use serde_json::Value;

// ─── Hook Event Types ────────────────────────────────────────────────────────

/// Claude Code Hook 事件类型
/// 参考 Swift: ClaudeHookEventName (14 cases)
/// 注意：Claude Code 发送的是 PascalCase 格式
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
    /// 事件是否需要用户交互
    pub fn requires_attention(&self) -> bool {
        matches!(self, Self::PermissionRequest | Self::Notification)
    }

    /// 事件是否静默处理
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

// ─── Permission Types ────────────────────────────────────────────────────────

/// 权限模式
/// 参考 Swift: ClaudePermissionMode
/// 注意：Claude Code 发送的是 camelCase 格式
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

/// 权限行为
/// 参考 Swift: ClaudePermissionBehavior
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CcPermBehavior {
    Allow,
    Deny,
    Ask,
}

/// 权限更新目标
/// 参考 Swift: ClaudePermissionUpdateDestination
/// 注意：Claude Code 发送的是 camelCase 格式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CcPermDest {
    UserSettings,
    ProjectSettings,
    LocalSettings,
    Session,
    CliArg,
}

// ─── Hook Data (从 stdin 接收) ───────────────────────────────────────────────

/// Claude Hook 原始数据（从 stdin 接收）
/// 参考 Swift: ClaudeHookPayload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcHookData {
    pub cwd: String,
    pub hook_event_name: CcHookEvent,
    pub session_id: String,

    // 可选字段 - 会话信息
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

    // 工具相关
    #[serde(default)]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub tool_input: Option<Value>,
    #[serde(default)]
    pub tool_use_id: Option<String>,
    #[serde(default)]
    pub tool_response: Option<Value>,

    // 权限相关
    #[serde(default)]
    pub permission_suggestions: Option<Vec<CcPermUpdate>>,

    // 消息相关
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

    // 错误相关
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub error_details: Option<String>,
    #[serde(default)]
    pub is_interrupt: Option<bool>,

    // 终端相关
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

    // 远程和来源
    #[serde(default)]
    pub remote: Option<bool>,
    #[serde(default)]
    pub hook_source: Option<String>,
}

// ─── Permission Update ───────────────────────────────────────────────────────

/// 权限更新规则
/// 参考 Swift: ClaudePermissionUpdate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcPermUpdate {
    /// JSON 字段名是 "type"
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

/// 权限规则
/// 参考 Swift: ClaudePermissionRuleValue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcPermRule {
    pub tool_name: String,
    #[serde(default)]
    pub rule_content: Option<String>,
}

// ─── Directive (响应给 Agent) ────────────────────────────────────────────────

/// Claude Hook 指令（响应给 Agent）
/// 参考 Swift: ClaudeHookDirective
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CcDirective {
    /// PreToolUse 事件的响应
    PreToolUse(CcPreToolUseResp),
    /// PermissionRequest 事件的响应
    PermissionRequest(CcPermReqResp),
}

/// PreToolUse 响应
/// 参考 Swift: ClaudePreToolUseDirective
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

/// PermissionRequest 响应
/// 参考 Swift: ClaudePermissionRequestDecision
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

// ─── Hook Request/Response (Tauri IPC) ──────────────────────────────────────

/// 发送给前端的统一请求结构
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

/// 前端返回的响应结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookResponse {
    pub uuid: String,
    pub action: HookAction,
}

/// 前端执行的动作
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum HookAction {
    /// 允许操作
    Allow,
    /// 拒绝操作
    Deny,
    /// 回答问题
    Answer { answer: Value },
    /// 自定义指令（高级用法）
    Custom { directive: CcDirective },
}

// ─── Helper Functions ────────────────────────────────────────────────────────

impl CcHookData {
    /// 从 CcHookData 构造 HookRequest
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

    /// 获取工作区名称（从 cwd 提取）
    pub fn workspace_name(&self) -> String {
        std::path::Path::new(&self.cwd)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string()
    }

    /// 获取工具输入预览
    pub fn tool_input_preview(&self) -> Option<String> {
        let input = self.tool_input.as_ref()?;
        let obj = input.as_object()?;

        let keys = ["command", "file_path", "pattern", "query", "prompt", "description"];
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
    /// 获取显示用的工具名称
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

    /// 获取工具图标
    pub fn tool_icon(&self) -> &str {
        match self.tool_name.as_deref() {
            Some("Bash") => "💻",
            Some("Write") | Some("Edit") => "📝",
            Some("Read") => "📖",
            Some("Glob") | Some("Grep") => "🔍",
            Some("AskUserQuestion") => "❓",
            _ => "🔧",
        }
    }
}

/// 截断字符串
fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}…", &s[..max_len - 1])
    }
}

// ─── Legacy Compatibility ────────────────────────────────────────────────────

/// 旧版 Claude 结构体（保持向后兼容）
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
    /// 转换为新的 CcHookData
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
