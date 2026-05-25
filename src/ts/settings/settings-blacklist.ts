import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./settings-shared";
import { loge } from "../index/logger";

const TAG = "Settings/Blacklist";

const blacklistInput = document.getElementById("blacklist-input") as HTMLInputElement | null;
const blacklistAddBtn = document.getElementById("blacklist-add-btn") as HTMLButtonElement | null;
const blacklistList = document.getElementById("blacklist-list") as HTMLDivElement | null;
const blacklistEnabledToggle = document.getElementById("blacklist-enabled-toggle") as HTMLInputElement | null;
const blacklistContentGroup = document.getElementById("blacklist-content-group") as HTMLDivElement | null;

let blacklistProcesses: string[] = [];

function updateBlacklistContentVisibility(enabled: boolean) {
  if (blacklistContentGroup) {
    blacklistContentGroup.style.opacity = enabled ? "1" : "0.4";
    blacklistContentGroup.style.pointerEvents = enabled ? "" : "none";
  }
}

async function loadBlacklist() {
  try {
    blacklistProcesses = await invoke<string[]>("get_blacklist");
    renderBlacklist();
  } catch (e) {
    loge(TAG, "load blacklist failed:", e);
  }
}

async function loadBlacklistEnabled() {
  try {
    const enabled = await invoke<boolean>("get_blacklist_enabled");
    if (blacklistEnabledToggle) blacklistEnabledToggle.checked = enabled;
    updateBlacklistContentVisibility(enabled);
  } catch (e) {
    loge(TAG, "load blacklist enabled failed:", e);
  }
}

function renderBlacklist() {
  if (!blacklistList) return;
  blacklistList.innerHTML = "";

  if (blacklistProcesses.length === 0) {
    const empty = document.createElement("p");
    empty.style.color = "var(--text-muted)";
    empty.style.fontSize = "13px";
    empty.textContent = "黑名单为空，添加进程名后生效。";
    blacklistList.appendChild(empty);
    return;
  }

  blacklistProcesses.forEach((name, index) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface);border-radius:8px;gap:8px;";

    const label = document.createElement("span");
    label.style.cssText = "font-family:monospace;font-size:13px;color:var(--text);flex:1;";
    label.textContent = name;
    row.appendChild(label);

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small";
    delBtn.style.color = "var(--danger, #ff6f7f)";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", async () => {
      blacklistProcesses.splice(index, 1);
      renderBlacklist();
      await saveBlacklist();
    });
    row.appendChild(delBtn);
    blacklistList.appendChild(row);
  });
}

async function saveBlacklist() {
  try {
    await invoke("save_blacklist", { processes: blacklistProcesses });
    showStatus("黑名单已保存");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
  }
}

async function addBlacklistEntry() {
  if (!blacklistInput) return;
  const val = blacklistInput.value.trim().toLowerCase();
  if (!val) return;
  if (blacklistProcesses.includes(val)) {
    showStatus("该进程已在黑名单中", true);
    return;
  }
  blacklistProcesses.push(val);
  blacklistInput.value = "";
  renderBlacklist();
  await saveBlacklist();
}

export function initBlacklist(): void {
  if (blacklistEnabledToggle) {
    blacklistEnabledToggle.addEventListener("change", async () => {
      const enabled = blacklistEnabledToggle.checked;
      updateBlacklistContentVisibility(enabled);
      try {
        await invoke("set_blacklist_enabled", { enabled });
        showStatus(enabled ? "黑名单已启用" : "黑名单已禁用");
      } catch (e) {
        showStatus(`保存失败: ${String(e)}`, true, 4500);
      }
    });
  }

  if (blacklistAddBtn) blacklistAddBtn.addEventListener("click", () => void addBlacklistEntry());
  if (blacklistInput) blacklistInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void addBlacklistEntry();
  });

  void loadBlacklist();
  void loadBlacklistEnabled();
}
