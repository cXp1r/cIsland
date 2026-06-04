import { HookRequest } from "./model";
import { respondToHook } from "./handler";

const AGENT_ICONS: Record<string, string> = {
    claude: `<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"></path></svg>`,
};

function getAgentIcon(agentType: string): string {
    return AGENT_ICONS[agentType.toLowerCase()] || "";
}

function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function renderCommandPreview(toolName: string, input: any): string {
    if (!input) return '<span class="oi-subtitle">无输入</span>';

    if (toolName === "Edit" && input.old_string !== undefined && input.new_string !== undefined) {
        return renderEditDiff(input);
    }

    if (toolName === "Write" && input.content !== undefined) {
        return renderWritePreview(input);
    }

    switch (toolName) {
        case "Bash":
            return `<span class="keyword">$</span> ${escapeHtml(input.command || "")}`;
        case "Read":
            return `<span class="path">${escapeHtml(input.file_path || "")}</span>`;
        case "Glob":
        case "Grep":
            return `<span class="string">${escapeHtml(input.pattern || "")}</span>`;
        case "ExitPlanMode":
            return `退出计划模式，开始实现`;
        default:
            return `<pre style="margin:0;white-space:pre-wrap;">${escapeHtml(JSON.stringify(input, null, 2))}</pre>`;
    }
}

function renderEditDiff(input: any): string {
    const filePath = input.file_path || "unknown";
    const oldLines = (input.old_string || "").split("\n");
    const newLines = (input.new_string || "").split("\n");
    const maxLines = Math.max(oldLines.length, newLines.length, 1);
    const displayLines = Math.min(maxLines, 50);

    let diffHtml = `<div class="oi-diff">`;
    diffHtml += `<div class="oi-diff-file">${escapeHtml(filePath)}</div>`;
    diffHtml += `<div class="oi-diff-content">`;

    for (let i = 0; i < displayLines; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];

        if (oldLine !== undefined && newLine !== undefined) {
            diffHtml += `<div class="oi-diff-line oi-diff-remove"><span class="oi-diff-prefix">-</span><span class="oi-diff-text">${escapeHtml(oldLine)}</span></div>`;
            diffHtml += `<div class="oi-diff-line oi-diff-add"><span class="oi-diff-prefix">+</span><span class="oi-diff-text">${escapeHtml(newLine)}</span></div>`;
        } else if (oldLine !== undefined) {
            diffHtml += `<div class="oi-diff-line oi-diff-remove"><span class="oi-diff-prefix">-</span><span class="oi-diff-text">${escapeHtml(oldLine)}</span></div>`;
        } else if (newLine !== undefined) {
            diffHtml += `<div class="oi-diff-line oi-diff-add"><span class="oi-diff-prefix">+</span><span class="oi-diff-text">${escapeHtml(newLine)}</span></div>`;
        }
    }
    diffHtml += `</div></div>`;
    return diffHtml;
}

function renderWritePreview(input: any): string {
    const filePath = input.file_path || "unknown";
    const content = input.content || "";
    const lines = content.split("\n");
    const displayLines = Math.min(lines.length, 8);
    const truncated = lines.length > displayLines;

    let html = `<div class="oi-diff">`;
    html += `<div class="oi-diff-file">${escapeHtml(filePath)}</div>`;
    html += `<div class="oi-diff-content">`;

    for (let i = 0; i < displayLines; i++) {
        html += `<div class="oi-diff-line oi-diff-add"><span class="oi-diff-prefix">+</span><span class="oi-diff-text">${escapeHtml(lines[i])}</span></div>`;
    }

    if (truncated) {
        html += `<div class="oi-diff-truncated">... 还有 ${lines.length - displayLines} 行</div>`;
    }

    html += `</div></div>`;
    return html;
}

const TOOL_LABELS: Record<string, { icon: string; label: string }> = {
    "Bash": { icon: "⚡", label: "终端命令" },
    "Write": { icon: "✏️", label: "写入文件" },
    "Edit": { icon: "✏️", label: "编辑文件" },
    "Read": { icon: "📖", label: "读取文件" },
    "Glob": { icon: "🔍", label: "搜索文件" },
    "Grep": { icon: "🔍", label: "搜索内容" },
    "AskUserQuestion": { icon: "❓", label: "回答问题" },
    "ExitPlanMode": { icon: "🚀", label: "退出计划模式" },
    "PermissionRequest": { icon: "🔐", label: "权限请求" },
};

function getToolLabel(toolName: string) {
    return TOOL_LABELS[toolName] || { icon: "🔧", label: toolName };
}

export function createApprovalCard(request: HookRequest): HTMLElement {
    const card = document.createElement("div");
    card.className = "oi-card";
    card.dataset.uuid = request.uuid;

    const config = getToolLabel(request.tool_name || "");
    const isPermissionRequest = request.hook_event === "PermissionRequest";

    card.innerHTML = `
        <div class="oi-header">
            <div class="oi-status-dot ${isPermissionRequest ? 'waiting' : ''}"></div>
            <span class="oi-agent-badge">${getAgentIcon(request.agent_type)}</span>
            <div class="oi-title-area">
                <div class="oi-title">${config.label}</div>
                <div class="oi-subtitle">${escapeHtml(request.tool_name || "")}</div>
            </div>
            <span class="oi-tool-icon">${config.icon}</span>
        </div>
        <div class="oi-body">
            <div class="oi-command-preview">${renderCommandPreview(request.tool_name || "", request.tool_input)}</div>
        </div>
        <div class="oi-actions">
            <button class="oi-btn oi-btn-secondary" data-action="deny">拒绝</button>
            <button class="oi-btn oi-btn-primary" data-action="allow">允许</button>
        </div>
    `;

    card.querySelector('[data-action="allow"]')?.addEventListener("click", async () => {
        await respondToHook(request.uuid, { type: "allow" });
        card.remove();
    });

    card.querySelector('[data-action="deny"]')?.addEventListener("click", async () => {
        await respondToHook(request.uuid, { type: "deny" });
        card.remove();
    });

    return card;
}

export function createQuestionCard(request: HookRequest): HTMLElement {
    const card = document.createElement("div");
    card.className = "oi-card";
    card.dataset.uuid = request.uuid;

    const questions = parseQuestions(request);

    card.innerHTML = `
        <div class="oi-header">
            <div class="oi-status-dot answer"></div>
            <span class="oi-agent-badge">${getAgentIcon(request.agent_type)}</span>
            <div class="oi-title-area">
                <div class="oi-title">回答问题</div>
                <div class="oi-subtitle">AskUserQuestion</div>
            </div>
            <span class="oi-tool-icon">❓</span>
        </div>
        <div class="oi-body">
            ${questions.map((q, qi) => `
                <div class="oi-question-header">问题 ${qi + 1}</div>
                <div class="oi-question-text">${escapeHtml(q.question)}</div>
                <div class="oi-options">
                    ${q.options.map((opt, oi) => `
                        <div class="oi-option" data-answer="${escapeHtml(opt.label)}">
                            <span class="oi-option-index">${oi + 1}</span>
                            <span class="oi-option-label">${escapeHtml(opt.label)}</span>
                            ${opt.description ? `<span class="oi-option-desc">${escapeHtml(opt.description)}</span>` : ""}
                        </div>
                    `).join("")}
                </div>
            `).join("")}
            <div class="oi-custom-input-wrap">
                <input type="text" class="oi-custom-input" placeholder="自定义回答..." />
                <button class="oi-btn oi-btn-primary" data-action="submit">发送</button>
            </div>
        </div>
    `;

    card.querySelectorAll(".oi-option").forEach(opt => {
        opt.addEventListener("click", async () => {
            const answer = opt.getAttribute("data-answer") || "";
            await respondToHook(request.uuid, { type: "answer", answer });
            card.remove();
        });
    });

    card.querySelector('[data-action="submit"]')?.addEventListener("click", async () => {
        const input = card.querySelector(".oi-custom-input") as HTMLInputElement;
        const answer = input?.value?.trim();
        if (answer) {
            await respondToHook(request.uuid, { type: "answer", answer });
            card.remove();
        }
    });

    (card.querySelector(".oi-custom-input") as HTMLInputElement)?.addEventListener("keydown", async (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            const input = e.target as HTMLInputElement;
            const answer = input?.value?.trim();
            if (answer) {
                await respondToHook(request.uuid, { type: "answer", answer });
                card.remove();
            }
        }
    });

    return card;
}

function parseQuestions(request: HookRequest): Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description?: string }>;
}> {
    const input = request.tool_input as any;
    if (!input?.questions) return [];

    return input.questions.map((q: any) => ({
        question: q.question || "",
        header: q.header || "",
        options: q.options || [],
    }));
}
