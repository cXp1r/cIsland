import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { loge } from "../index/logger";

const TAG = "Settings/SmtcWhitelist";

const smtcWhitelistInput = document.getElementById("smtc-whitelist-input") as HTMLInputElement | null;
const smtcWhitelistAddBtn = document.getElementById("smtc-whitelist-add-btn") as HTMLButtonElement | null;
const smtcWhitelistList = document.getElementById("smtc-whitelist-list") as HTMLDivElement | null;
const smtcWhitelistEnabledToggle = document.getElementById("smtc-whitelist-enabled") as HTMLInputElement | null;
const smtcWhitelistContentGroup = document.getElementById("smtc-whitelist-content-group") as HTMLDivElement | null;

let smtcWhitelistApps: string[] = [];

function updateSmtcWhitelistContentVisibility(enabled: boolean) {
  if (smtcWhitelistContentGroup) {
    smtcWhitelistContentGroup.style.opacity = enabled ? "1" : "0.4";
    smtcWhitelistContentGroup.style.pointerEvents = enabled ? "" : "none";
  }
}

async function loadSmtcWhitelist() {
  try {
    smtcWhitelistApps = await invoke<string[]>("get_smtc_whitelist");
    renderSmtcWhitelist();
  } catch (e) {
    loge(TAG, "load smtc whitelist failed:", e);
  }
}

async function loadSmtcWhitelistEnabled() {
  try {
    const enabled = await invoke<boolean>("get_smtc_whitelist_enabled");
    if (smtcWhitelistEnabledToggle) smtcWhitelistEnabledToggle.checked = enabled;
    updateSmtcWhitelistContentVisibility(enabled);
  } catch (e) {
    loge(TAG, "load smtc whitelist enabled failed:", e);
  }
}

function renderSmtcWhitelist() {
  if (!smtcWhitelistList) return;
  smtcWhitelistList.innerHTML = "";

  if (smtcWhitelistApps.length === 0) {
    const empty = document.createElement("p");
    empty.style.color = "var(--text-muted)";
    empty.style.fontSize = "13px";
    empty.textContent = "白名单为空，添加 app_id 后生效。";
    smtcWhitelistList.appendChild(empty);
    return;
  }

  smtcWhitelistApps.forEach((name, index) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface);border-radius:8px;gap:8px;";

    const label = document.createElement("span");
    label.textContent = name;
    row.appendChild(label);

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small";
    delBtn.style.color = "var(--danger, #ff6f7f)";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", async () => {
      smtcWhitelistApps.splice(index, 1);
      renderSmtcWhitelist();
      await saveSmtcWhitelist();
    });
    row.appendChild(delBtn);
    smtcWhitelistList.appendChild(row);
  });
}

async function saveSmtcWhitelist() {
  try {
    await invoke("save_smtc_whitelist", { appIds: smtcWhitelistApps });
    showStatus("SMTC 白名单已保存");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
  }
}

async function addSmtcWhitelistEntry() {
  if (!smtcWhitelistInput) return;
  const val = smtcWhitelistInput.value.trim().toLowerCase();
  if (!val) return;
  if (smtcWhitelistApps.includes(val)) {
    showStatus("该 app_id 已在白名单中", true);
    return;
  }
  smtcWhitelistApps.push(val);
  smtcWhitelistInput.value = "";
  renderSmtcWhitelist();
  await saveSmtcWhitelist();
}

export function initSettingsSmtcWhitelist(): void {
  if (smtcWhitelistEnabledToggle) {
    smtcWhitelistEnabledToggle.addEventListener("change", async () => {
      const enabled = smtcWhitelistEnabledToggle.checked;
      updateSmtcWhitelistContentVisibility(enabled);
      try {
        await invoke("set_smtc_whitelist_enabled", { enabled });
        showStatus(enabled ? "SMTC 白名单已启用" : "SMTC 白名单已禁用");
      } catch (e) {
        showStatus(`保存失败: ${String(e)}`, true, 4500);
      }
    });
  }

  if (smtcWhitelistAddBtn) smtcWhitelistAddBtn.addEventListener("click", () => void addSmtcWhitelistEntry());
  if (smtcWhitelistInput) smtcWhitelistInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void addSmtcWhitelistEntry();
  });

  void loadSmtcWhitelist();
  void loadSmtcWhitelistEnabled();
}
