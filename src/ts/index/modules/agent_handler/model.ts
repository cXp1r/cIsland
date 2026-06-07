export type CcHookEvent =
  | "SessionStart"
  | "SessionEnd"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "PermissionRequest"
  | "PermissionDenied"
  | "Notification"
  | "Stop"
  | "StopFailure"
  | "SubagentStart"
  | "SubagentStop"
  | "PreCompact";

export type CcPermMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "dontAsk"
  | "bypassPermissions"
  | "auto";

export type CcPermBehavior = "allow" | "deny" | "ask";

export interface CcHookData {
  cwd: string;
  hook_event_name: CcHookEvent;
  session_id: string;
  transcript_path?: string;
  permission_mode?: CcPermMode;
  agent_id?: string;
  agent_type?: string;
  model?: string;
  source?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_use_id?: string;
  tool_response?: Record<string, unknown>;
  permission_suggestions?: CcPermUpdate[];
  prompt?: string;
  message?: string;
  title?: string;
  notification_type?: string;
  subtype?: string;
  stop_hook_active?: boolean;
  last_assistant_message?: string;
  error?: string;
  error_details?: string;
  is_interrupt?: boolean;
  terminal_app?: string;
  terminal_session_id?: string;
  terminal_tty?: string;
  terminal_title?: string;
  warp_pane_uuid?: string;
  remote?: boolean;
  hook_source?: string;
}

export interface CcPermUpdate {
  type: string;
  destination: string;
  rules?: CcPermRule[];
  behavior?: CcPermBehavior;
  mode?: CcPermMode;
  directories?: string[];
}

export interface CcPermRule {
  tool_name: string;
  rule_content?: string;
}

export interface HookRequest {
  uuid: string;
  agent_type: string;
  session_id: string;
  hook_event: CcHookEvent;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  cwd: string;
  hook_data: CcHookData;
}

export type HookAction =
  | { type: "allow" }
  | { type: "deny" }
  | { type: "answer"; answer: unknown }
  | { type: "custom"; directive: CcDirective }
  | { type: "stop"; reason: string };

export interface HookResponse {
  uuid: string;
  action: HookAction;
}

export type CcDirective =
  | { type: "pre_tool_use"; directive: CcPreToolUseResp }
  | { type: "permission_request"; directive: CcPermReqResp }
  | { type: "stop"; decision: string; reason: string };

export interface CcPreToolUseResp {
  permission_decision?: CcPermBehavior;
  permission_decision_reason?: string;
  updated_input?: Record<string, unknown>;
  additional_context?: string;
}

export interface CcPermReqResp {
  behavior: CcPermBehavior;
  updated_input?: Record<string, unknown>;
  updated_permissions?: CcPermUpdate[];
  message?: string;
  interrupt?: boolean;
}

/** @deprecated */
export interface Request {
  name: string;
  action: Action;
  uuid: string;
  sid: string;
  payload: unknown;
}

/** @deprecated */
export type Action = "edit" | "question" | "bash";
