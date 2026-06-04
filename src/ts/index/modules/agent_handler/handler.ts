import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { capsule, agentHandler } from "../../dom";
import { HookRequest, HookAction, CcHookEvent } from "./model";
import { createApprovalCard, createQuestionCard } from "./views";
import { logi } from "../../logger";

const TAG = "AgentHandler";

const HEIGHTS = {
    approval: 160,
    diff: 390,
    question1: 290,
    question2: 380,
};

const NEED_APPROVAL_TOOLS = [
    "Bash",
    "Write",
    "Edit",
    "PermissionRequest",
];

const SILENT_EVENTS: CcHookEvent[] = [
    "SessionStart",
    "SessionEnd",
    "PostToolUse",
    "PostToolUseFailure",
    "Stop",
    "StopFailure",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
];

let activeCard: HTMLElement | null = null;
let activeUuid: string | null = null;

function calculateHeight(request: HookRequest): number {
    if (request.tool_name === "AskUserQuestion") {
        const questions = (request.tool_input as any)?.questions || [];
        return questions.length > 1 ? HEIGHTS.question2 : HEIGHTS.question1;
    }
    if (request.tool_name === "Edit" || request.tool_name === "Write") {
        return HEIGHTS.diff;
    }
    return HEIGHTS.approval;
}


function updateContainerSize(height: number) {
    const rounded = height;
    const root = document.documentElement;
    root.style.setProperty('--agent-handler-h', `${rounded}px`);
    logi(TAG, `更新高度: ${height}px → ${rounded}px`);
}

export function initAgentHandler() {
    logi(TAG, "初始化 Agent Handler");

    listen<HookRequest>("hook_request", async (event) => {
        const request = event.payload;
        logi(TAG, `收到请求: uuid=${request.uuid} event=${request.hook_event} tool=${request.tool_name}`);
        await handleHookRequest(request);
    });

    agentHandler.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

async function handleHookRequest(request: HookRequest) {
    if (SILENT_EVENTS.includes(request.hook_event)) {
        logi(TAG, `静默事件，自动允许: ${request.hook_event}`);
        await respondToHook(request.uuid, { type: "allow" });
        return;
    }

    if (request.hook_event === "PermissionRequest") {
        showCard(createApprovalCard(request), request);
        return;
    }

    if (request.tool_name === "AskUserQuestion") {
        showCard(createQuestionCard(request), request);
        return;
    }

    if (request.tool_name && NEED_APPROVAL_TOOLS.includes(request.tool_name)) {
        showCard(createApprovalCard(request), request);
        return;
    }

    logi(TAG, `默认允许: ${request.hook_event} ${request.tool_name}`);
    await respondToHook(request.uuid, { type: "allow" });
}

export async function respondToHook(uuid: string, action: HookAction): Promise<void> {
    try {
        await invoke("respond_to_hook", { uuid, action });
        logi(TAG, `响应成功: uuid=${uuid} action=${JSON.stringify(action)}`);

        if (activeUuid === uuid) {
            hideCard();
        }
    } catch (error) {
        console.error("[Hook] 响应失败:", error);
    }
}

function showCard(card: HTMLElement, request: HookRequest) {
    if (activeCard) {
        activeCard.remove();
    }

    agentHandler.innerHTML = "";
    agentHandler.appendChild(card);
    activeCard = card;

    const uuid = card.dataset.uuid;
    if (uuid) {
        activeUuid = uuid;
    }

    const height = calculateHeight(request);
    updateContainerSize(height);

    capsule.classList.add("agent-handler-active");
    agentHandler.classList.add("active");

    logi(TAG, `显示卡片: uuid=${activeUuid} height=${height}`);
}

function hideCard() {
    if (activeCard) {
        activeCard.remove();
        activeCard = null;
    }

    activeUuid = null;
    agentHandler.innerHTML = "";
    agentHandler.classList.remove("active");
    capsule.classList.remove("agent-handler-active");

    logi(TAG, "隐藏卡片");
}

export function hideAllCards() {
    hideCard();
}
