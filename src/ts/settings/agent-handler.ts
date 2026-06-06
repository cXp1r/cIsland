import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import type { AgentHooksInstallResult } from "./types";

const AGENTS = ["claude", "codex"] as const;
const buttonList = document.getElementById("agent-list") as HTMLDivElement;

let initialized = false;

async function findAgentPath(agent: string): Promise<string> {
  try {
    return await invoke<string>("find_path_by_where", { name: agent });
  } catch {
    return "PATH 中未找到";
  }
}

function renderResult(result: AgentHooksInstallResult): string {
  return [
    `代理: ${result.agent}`,
    `IPC 助手: ${result.ipc_helper_path}`,
    ...result.targets.map((target) => `目标: ${target}`),
  ].join("\n");
}

async function installAgent(agent: string, button: HTMLButtonElement, desc: HTMLParagraphElement): Promise<void> {
  const originalText = button.textContent || "安装 Hook";
  button.disabled = true;
  button.textContent = "安装中...";

  try {
    const results = await invoke<AgentHooksInstallResult[]>("install_agent_hooks", {
      agents: [agent],
    });
    desc.textContent = results.map(renderResult).join("\n\n");
    showStatus(`${agent} Hook 已安装`, false, 5000);
  } catch (e) {
    desc.textContent = `安装失败: ${String(e)}`;
    showStatus(`${agent} Hook 安装失败: ${String(e)}`, true, 7000);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function scan(): Promise<void> {
  buttonList.innerHTML = "";

  for (const agent of AGENTS) {
    const foundPath = await findAgentPath(agent);
    const item = document.createElement("div");
    item.className = "setting-item";

    const label = document.createElement("div");
    label.className = "setting-label";

    const title = document.createElement("h3");
    title.textContent = agent;

    const desc = document.createElement("p");
    desc.style.whiteSpace = "pre-line";
    desc.textContent = `路径: ${foundPath}`;

    label.appendChild(title);
    label.appendChild(desc);

    const control = document.createElement("div");
    control.className = "setting-control";

    const btn = document.createElement("button");
    btn.className = "agent-handler-install-btn btn";
    btn.type = "button";
    btn.dataset.name = agent;
    btn.textContent = "安装 Hook";
    btn.addEventListener("click", () => void installAgent(agent, btn, desc));

    control.appendChild(btn);
    item.appendChild(label);
    item.appendChild(control);
    buttonList.appendChild(item);
  }
}

export function initSettingsAgentHandlerInstaller(): void {
  if (initialized) return;
  initialized = true;
  void scan();
}
