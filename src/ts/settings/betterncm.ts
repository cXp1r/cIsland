import { invoke } from "@tauri-apps/api/core";
import { showStatus, openExternal, INFLINK_URL } from "./shared";
import type { PluginMarketRepairResult } from "./types";

const betterncmPathInput = document.getElementById("betterncm-path") as HTMLInputElement;
const repairBtn = document.getElementById("install-betterncm-btn") as HTMLButtonElement;
const openInfLinkBtn = document.getElementById("open-inflink-btn") as HTMLButtonElement;

export function initSettingsBetterncm(): void {
  openInfLinkBtn.addEventListener("click", () => {
    openExternal(INFLINK_URL);
  });

  repairBtn.addEventListener("click", async () => {
    const installRoot = betterncmPathInput.value.trim();
    const originalText = repairBtn.textContent || "执行 main.js 源修复";

    repairBtn.disabled = true;
    repairBtn.textContent = "修复中...";

    try {
      const result = await invoke<PluginMarketRepairResult>("install_betterncm_support", {
        installRoot: installRoot || null,
      });

      const parts: string[] = [];
      parts.push(result.runtime_patched ? "运行时 main.js 已替换" : "运行时 main.js 无需替换");
      parts.push(result.archive_patched ? "Plugin 包 main.js 已替换" : "Plugin 包 main.js 无需替换");

      showStatus(`修复完成（${result.root}）：${parts.join("，")}`, false, 7000);
    } catch (e) {
      showStatus(`修复失败: ${String(e)}`, true, 7000);
    } finally {
      repairBtn.disabled = false;
      repairBtn.textContent = originalText;
    }
  });
}
