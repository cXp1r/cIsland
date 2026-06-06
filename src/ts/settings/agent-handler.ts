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
    return "not found in PATH";
  }
}

function renderResult(result: AgentHooksInstallResult): string {
  return [
    `agent: ${result.agent}`,
    `ipc: ${result.ipc_helper_path}`,
    ...result.targets.map((target) => `target: ${target}`),
  ].join("\n");
}

async function installAgent(agent: string, button: HTMLButtonElement, desc: HTMLParagraphElement): Promise<void> {
  const originalText = button.textContent || "install hooks";
  button.disabled = true;
  button.textContent = "installing...";

  try {
    const results = await invoke<AgentHooksInstallResult[]>("install_agent_hooks", {
      agents: [agent],
    });
    desc.textContent = results.map(renderResult).join("\n\n");
    showStatus(`${agent} hooks installed`, false, 5000);
  } catch (e) {
    desc.textContent = `install failed: ${String(e)}`;
    showStatus(`${agent} hooks install failed: ${String(e)}`, true, 7000);
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
    desc.textContent = `path: ${foundPath}`;

    label.appendChild(title);
    label.appendChild(desc);

    const control = document.createElement("div");
    control.className = "setting-control";

    const btn = document.createElement("button");
    btn.className = "agent-handler-install-btn btn";
    btn.type = "button";
    btn.dataset.name = agent;
    btn.textContent = "install hooks";
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
