import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { agentHandler, capsule } from "./dom";
import { HookRequest, HookAction } from "./model";
import {
    createApprovalCard,
    createNotification,
    createQuestionCard,
    createStopCard,
} from "./renderer";
import { logi } from "../../shared/logger";
import { animateCapsule } from "../../utils/rAF";

const TAG = "AgentHandler";
const AGENT_HANDLER_WIDTH = 550;


const NEED_APPROVAL_TOOLS = [
    "Bash",
    "Write",
    "Edit",
    "PermissionRequest",
];

const INFO_TOOLS = [
    "Notification",
    "SessionEnd",
]

const ERROR_TOOLS = [
    "PostToolUseFailure",
    "StopFailure",
]

let activeCard: HTMLElement | null = null;
let activeUuid: string | null = null;

function calculateHeight(request: HookRequest): number {
    //在适配之后暂时先用一个定值
    if (request.tool_name === "AskUserQuestion") {
        return 400
    }
    if (request.tool_name === "Bash" || request.tool_name === "Read") {
        return 200
    }
    if (request.tool_name === "Edit" || request.tool_name === "Write") {
        return 390;
    }
    return 400;
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
    if (request.tool_name === "AskUserQuestion") {
        showCard(createQuestionCard(request), request);
        return;
    }

    if (request.hook_event === "PermissionRequest") {
        showCard(createApprovalCard(request), request);
        return;
    }

    if (request.tool_name && NEED_APPROVAL_TOOLS.includes(request.tool_name)) {
        showCard(createApprovalCard(request), request);
        return;
    }

    if (request.hook_event === "Stop") {
        showCard(createStopCard(request), request);
        return;
    }

    if (INFO_TOOLS.includes(request.hook_event) || ERROR_TOOLS.includes(request.hook_event)) {
        showCard(createNotification(request), request);
        return;
    }

    logi(TAG, `默认允许: ${request}`);
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
    animateCapsule(AGENT_HANDLER_WIDTH, height);

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
