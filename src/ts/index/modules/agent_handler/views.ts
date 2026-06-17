import { HookRequest } from "./model";
import { respondToHook } from "./handler";
import { renderMarkdown, bindMarkdownButtons } from "../../md";

const AGENT_ICONS: Record<string, string> = {
    claude: `<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"></path></svg>`,
    gemini: `<svg xmlns="http://www.w3.org/2000/svg" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em"><title>Gemini</title><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"/><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-0-_R_0_)"/><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-1-_R_0_)"/><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-2-_R_0_)"/><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-0-_R_0_" x1="7" x2="11" y1="15.5" y2="12"><stop stop-color="#08B962"/><stop offset="1" stop-color="#08B962" stop-opacity="0"/></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-1-_R_0_" x1="8" x2="11.5" y1="5.5" y2="11"><stop stop-color="#F94543"/><stop offset="1" stop-color="#F94543" stop-opacity="0"/></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-2-_R_0_" x1="3.5" x2="17.5" y1="13.5" y2="12"><stop stop-color="#FABC12"/><stop offset=".46" stop-color="#FABC12" stop-opacity="0"/></linearGradient></defs></svg>`,
    codex: `<svg xmlns="http://www.w3.org/2000/svg" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em"><title>Codex</title><path d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z" fill="#fff"/><path d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z" fill="url(#lobe-icons-codex-_R_0_)"/><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-codex-_R_0_" x1="12" x2="12" y1="3" y2="21"><stop stop-color="#B1A7FF"/><stop offset=".5" stop-color="#7A9DFF"/><stop offset="1" stop-color="#3941FF"/></linearGradient></defs></svg>`,
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
    if (!input) return '<span class="oi-subtitle">No input</span>';

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
            return `Exit plan mode`;
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
    diffHtml += `<div class="oi-diff-content cscrollbar">`;

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
        html += `<div class="oi-diff-truncated">... ${lines.length - displayLines} more lines</div>`;
    }

    html += `</div></div>`;
    return html;
}




type CardStatusVariant = "waiting" | "answer";

interface CardShellConfig {
    request: HookRequest;
    title: string;
    subtitle: string;
    statusVariant: CardStatusVariant;
    bodyHtml: string;
    actionsHtml: string;
    bindEvents: (card: HTMLElement) => void;
}

function createAgentCard(config: CardShellConfig): HTMLElement {
    const card = document.createElement("div");
    card.className = "oi-card";
    card.dataset.uuid = config.request.uuid;

    card.innerHTML = `
        <div class="oi-header">
            <div class="oi-status-dot ${config.statusVariant}"></div>
            <span class="oi-agent-badge">${getAgentIcon(config.request.agent_type)}</span>
            <div class="oi-title-area">
                <div class="oi-title">${escapeHtml(config.title)}</div>
                <div class="oi-subtitle">${escapeHtml(config.subtitle)}</div>
            </div>
        </div>
        <div class="oi-body cscrollbar">
            ${config.bodyHtml}
        </div>
        ${config.actionsHtml}
    `;

    config.bindEvents(card);
    return card;
}

export function createApprovalCard(request: HookRequest): HTMLElement {
    const isPermissionRequest = request.hook_event === "PermissionRequest";

    return createAgentCard({
        request,
        title: request.hook_event,
        subtitle: request.tool_name || "",
        statusVariant: isPermissionRequest ? "waiting" : "answer",
        bodyHtml: `<div class="oi-command-preview">${renderCommandPreview(request.tool_name || "", request.tool_input)}</div>`,
        actionsHtml: `
            <div class="oi-actions">
                <button class="oi-btn oi-btn-secondary" data-action="deny">Deny</button>
                <button class="oi-btn oi-btn-primary" data-action="allow">Allow</button>
            </div>
        `,
        bindEvents: (card) => {
            card.querySelector('[data-action="allow"]')?.addEventListener("click", async () => {
                await respondToHook(request.uuid, { type: "allow" });
                card.remove();
            });

            card.querySelector('[data-action="deny"]')?.addEventListener("click", async () => {
                await respondToHook(request.uuid, { type: "deny" });
                card.remove();
            });
        },
    });
}

export function createQuestionCard(request: HookRequest): HTMLElement {
    const questions = parseQuestions(request);
    const isMultiQuestion = questions.length > 1;
    const basePayload = {
        questions: questions.map((q) => ({
            question: q.question,
            header: q.header,
            options: q.options.map((opt) => ({
                label: opt.label,
                description: opt.description,
            })),
            multiSelect: false,
        })),
    };

    return createAgentCard({
        request,
        title: "Answer Question",
        subtitle: "AskUserQuestion",
        statusVariant: "answer",
        bodyHtml: `
            <div class="oi-question-list">
                ${questions.map((q, qi) => `
                    <div class="oi-question-block" data-question-index="${qi}">
                        <div class="oi-question-header">${escapeHtml(q.header || `Question ${qi + 1}`)}</div>
                        <div class="oi-question-text">${escapeHtml(q.question)}</div>
                        <div class="oi-options">
                            ${q.options.map((opt, oi) => `
                                <div class="oi-option" data-question-index="${qi}" data-answer="${escapeHtml(opt.label)}">
                                    <span class="oi-option-index">${oi + 1}</span>
                                    <span class="oi-option-label">${escapeHtml(opt.label)}</span>
                                    ${opt.description ? `<span class="oi-option-desc">${escapeHtml(opt.description)}</span>` : ""}
                                </div>
                            `).join("")}
                        </div>
                        <div class="oi-custom-input-wrap oi-question-custom-input-wrap">
                            <input type="text" class="oi-custom-input oi-question-custom-input" data-question-index="${qi}" placeholder="Custom answer..." />
                        </div>
                    </div>
                `).join("")}
            </div>
        `,
        actionsHtml: isMultiQuestion ? `
            <div class="oi-actions">
                <button class="oi-btn oi-btn-primary" data-action="submit" disabled>Submit</button>
            </div>
        ` : "",
        bindEvents: (card) => {
            if (!isMultiQuestion) {
                card.querySelectorAll(".oi-option").forEach(opt => {
                    opt.addEventListener("click", async () => {
                        const answer = opt.getAttribute("data-answer") || "";
                        const question = questions.find((q) => q.options.some((option) => option.label === answer));
                        const payload = {
                            ...basePayload,
                            answers: question ? { [question.question]: answer } : {},
                        };
                        await respondToHook(request.uuid, { type: "answer", answer: payload });
                        card.remove();
                    });
                });

                (card.querySelector(".oi-custom-input") as HTMLInputElement).addEventListener("keydown", async (e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        const answer = input?.value?.trim();
                        if (answer) {
                            await respondToHook(request.uuid, { type: "answer", answer });
                            card.remove();
                        }
                    }
                });
                return;
            }
            

            const selectedAnswers = new Map<string, string>();
            const submitButton = card.querySelector('[data-action="submit"]') as HTMLButtonElement | null;
            const inputs = Array.from(card.querySelectorAll(".oi-question-custom-input")) as HTMLInputElement[];

            const syncSubmitState = () => {
                const hasActive = selectedAnswers.size > 0;
                const hasInput = inputs.some((el) => !!el.value.trim());
                if (submitButton) {
                    submitButton.disabled = !hasActive && !hasInput;
                }
            };

            card.querySelectorAll(".oi-option").forEach(opt => {
                opt.addEventListener("click", () => {
                    const answer = opt.getAttribute("data-answer") || "";
                    const questionIndex = opt.getAttribute("data-question-index") || "";
                    const question = questions[Number(questionIndex)];
                    if (!question) return;

                    const questionInput = card.querySelector(`.oi-question-custom-input[data-question-index="${questionIndex}"]`) as HTMLInputElement | null;
                    card.querySelectorAll(`.oi-option[data-question-index="${questionIndex}"]`).forEach((el) => {
                        el.classList.remove("active");
                    });
                    if (questionInput?.value.trim()) {
                        questionInput.value = "";
                    }
                    opt.classList.add("active");
                    selectedAnswers.set(question.question, answer);
                    syncSubmitState();
                });
            });

            inputs.forEach((el) => {
                el.addEventListener("input", syncSubmitState);
                el.addEventListener("focus", () => {
                    const questionIndex = el.getAttribute("data-question-index");
                    if (!questionIndex) return;
                    const question = questions[Number(questionIndex)];
                    if (!question) return;

                    selectedAnswers.delete(question.question);
                    card.querySelectorAll(`.oi-option[data-question-index="${questionIndex}"]`).forEach((option) => {
                        option.classList.remove("active");
                    });
                    syncSubmitState();
                });
                el.addEventListener("keydown", async (e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        submitButton?.click();
                    }
                });
            });

            submitButton?.addEventListener("click", async () => {
                const hasActive = selectedAnswers.size > 0;
                const customAnswers = new Map<string, string>();
                inputs.forEach((el) => {
                    const questionIndex = Number(el.getAttribute("data-question-index"));
                    const question = questions[questionIndex];
                    const value = el.value.trim();
                    if (question && value) {
                        customAnswers.set(question.question, value);
                    }
                });

                if (!hasActive && customAnswers.size === 0) return;

                const mergedAnswers = new Map<string, string>();
                questions.forEach((question) => {
                    const selected = selectedAnswers.get(question.question);
                    const custom = customAnswers.get(question.question);
                    const value = selected || custom;
                    if (value) {
                        mergedAnswers.set(question.question, value);
                    }
                });

                if (mergedAnswers.size !== questions.length) {
                    const firstMissingIndex = questions.findIndex((question) => !mergedAnswers.has(question.question));
                    const firstMissingBlock = firstMissingIndex >= 0
                        ? card.querySelector(`.oi-question-block[data-question-index="${firstMissingIndex}"]`) as HTMLElement | null
                        : null;

                    if (firstMissingBlock) {
                        firstMissingBlock.scrollIntoView({ behavior: "smooth", block: "center" });
                        firstMissingBlock.classList.remove("oi-question-block-missing");
                        void firstMissingBlock.offsetWidth;
                        firstMissingBlock.classList.add("oi-question-block-missing");
                        window.setTimeout(() => {
                            firstMissingBlock.classList.remove("oi-question-block-missing");
                        }, 1200);
                    }
                    return;
                }

                const payload = {
                    ...basePayload,
                    answers: Object.fromEntries(mergedAnswers.entries()),
                };

                await respondToHook(request.uuid, { type: "answer", answer: payload });
                card.remove();
            });

            syncSubmitState();
        },
    });
}

export function createNotification(request: HookRequest): HTMLElement {
    return createAgentCard({
        request,
        title: "Notification",
        subtitle: request.tool_name || "",
        statusVariant: "answer",
        bodyHtml: `<div class="oi-md-preview cscrollbar" data-cwd="${escapeHtml(request.cwd)}">${renderMarkdown(request.hook_data.last_assistant_message || "", request.cwd)}</div>`,
        actionsHtml: `
            <div class="oi-actions">
                <button class="oi-btn oi-btn-primary" data-action="dismiss">Dismiss</button>
            </div>
        `,
        bindEvents: (card) => {
            bindMarkdownButtons(card);

            card.querySelector('[data-action="dismiss"]')?.addEventListener("click", async () => {
                await respondToHook(request.uuid, { type: "allow" });
                card.remove();
            });
        },
    });
}

export function createStopCard(request: HookRequest): HTMLElement {
    return createAgentCard({
        request,
        title: "Stop",
        subtitle: request.tool_name || "",
        statusVariant: "answer",
        bodyHtml: `<div class="oi-md-preview cscrollbar" data-cwd="${escapeHtml(request.cwd)}">${renderMarkdown(request.hook_data.last_assistant_message || request.hook_data.message || "", request.cwd)}</div>`,
        actionsHtml: `
            <div class="oi-actions">
                <input type="text" class="oi-custom-input oi-stop-input" placeholder="写下一轮提示词" />
                <button class="oi-btn oi-btn-primary" data-action="submit" disabled>Submit</button>
                <button class="oi-btn oi-btn-primary" data-action="dismiss">End</button>
            </div>
        `,
        bindEvents: (card) => {
            bindMarkdownButtons(card);

            const input = card.querySelector(".oi-stop-input") as HTMLInputElement | null;
            const submitButton = card.querySelector('[data-action="submit"]') as HTMLButtonElement | null;

            const syncSubmitState = () => {
                if (submitButton) {
                    submitButton.disabled = !input?.value.trim();
                }
            };

            input?.addEventListener("input", syncSubmitState);
            input?.addEventListener("keydown", async (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    submitButton?.click();
                }
            });

            submitButton?.addEventListener("click", async () => {
                const reason = input?.value.trim();
                if (!reason) return;
                await respondToHook(request.uuid, {
                    type: "custom",
                    directive: {
                        type: "stop",
                        decision: "block",
                        reason,
                    },
                });
                card.remove();
            });

            card.querySelector('[data-action="dismiss"]')?.addEventListener("click", async () => {
                await respondToHook(request.uuid, {
                    type: "custom",
                    directive: {
                        type: "stop",
                        decision: "approve",
                        reason: "",
                    },
                });
                card.remove();
            });

            syncSubmitState();
        },
    });
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
