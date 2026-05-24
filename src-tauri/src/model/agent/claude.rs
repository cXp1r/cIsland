use serde::Deserialize;

// ─── Main Claude struct ───────────────────────────────────────────────────────

#[derive(Deserialize, Debug)]
pub struct Claude {
    pub session_id: String,        // id
    pub cwd: String,               // 工作目录
    pub permission_mode: String,   // 权限模式
    pub hook_event_name: String,   // 事件名称
    pub tool_name: String,         // 工具名称
    pub tool_input: serde_json::Value, // stay raw — parsed via parse_tool_input()
}

impl Claude {
    pub fn parse_tool_input(&self) -> CcToolInput {
        match self.tool_name.as_str() {
            "Read" => serde_json::from_value::<CcRead>(self.tool_input.clone())
                .map(CcToolInput::CcRead)
                .unwrap_or(CcToolInput::Unknown(self.tool_input.clone())),

            "Bash" => serde_json::from_value::<CcBash>(self.tool_input.clone())
                .map(CcToolInput::CcBash)
                .unwrap_or(CcToolInput::Unknown(self.tool_input.clone())),

            "Write" => serde_json::from_value::<CcWrite>(self.tool_input.clone())
                .map(CcToolInput::CcWrite)
                .unwrap_or(CcToolInput::Unknown(self.tool_input.clone())),

            "Edit" => serde_json::from_value::<CcEdit>(self.tool_input.clone())
                .map(CcToolInput::CcEdit)
                .unwrap_or(CcToolInput::Unknown(self.tool_input.clone())),

            "AskUserQuestion" => serde_json::from_value::<CcAskUserQuestion>(self.tool_input.clone())
                .map(CcToolInput::CcAskUserQuestion)
                .unwrap_or(CcToolInput::Unknown(self.tool_input.clone())),

            "PermissionRequest" => serde_json::from_value::<PermissionRequest>(self.tool_input.clone())
                .map(CcToolInput::CcPermissionRequest)
                .unwrap_or(CcToolInput::Unknown(self.tool_input.clone())),

            _ => CcToolInput::Unknown(self.tool_input.clone()),
        }
    }
}

// ─── ToolInput enum ───────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum CcToolInput {
    CcRead(CcRead),
    CcBash(CcBash),
    CcWrite(CcWrite),
    CcEdit(CcEdit),
    CcAskUserQuestion(CcAskUserQuestion),
    CcPermissionRequest(PermissionRequest),
    Unknown(serde_json::Value), // fallback for unrecognized tool names
}

// ─── Tool input structs ───────────────────────────────────────────────────────

#[derive(Deserialize, Debug)]
pub struct PermissionRequest {
    pub command: String,
    pub description: String,
}

#[derive(Deserialize, Debug)]
pub struct CcBash {
    pub command: String,
    pub description: Option<String>, // not always present
    pub timeout: Option<u32>,        // not always present
}

#[derive(Deserialize, Debug)]
pub struct CcWrite {
    pub file_path: String,
    pub content: String,
}

#[derive(Deserialize, Debug)]
pub struct CcRead {
    pub file_path: String,
    pub offset: Option<u32>, // optional, use u32 not String
    pub limit: Option<u32>,  // optional, use u32 not String
}

#[derive(Deserialize, Debug)]
pub struct CcEdit {
    pub file_path: String,
    pub old_string: String,
    pub new_string: String,
    pub replace_all: Option<bool>, // not always present
}

#[derive(Deserialize, Debug)]
pub struct CcAskUserQuestion {
    pub questions: Vec<CcQu>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")] // handles multiSelect → multi_select
pub struct CcQu {
    pub question: String,
    pub header: String,
    pub options: Vec<CcQu2>,
    pub multi_select: bool,
}

#[derive(Deserialize, Debug)]
pub struct CcQu2 {
    pub label: String,
}