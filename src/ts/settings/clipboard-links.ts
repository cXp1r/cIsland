import { invoke } from "@tauri-apps/api/core";
import { getLinkHandlers, initLinkHandlers } from "./link-handler";
import { showStatus } from "./shared";
import { $ } from "../shared";
import type { ClipboardLinksSettingsConfig } from "./types";

const els = {
  page: $<HTMLElement>("page-clipboard-links"),
  clipboardToggle: $<HTMLInputElement>("clipboard-toggle"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: ClipboardLinksSettingsConfig | null = null;
let bound = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function render(): void {
  els.clipboardToggle.checked = cache!.clipboard_enabled;
}

function readCurrent(): ClipboardLinksSettingsConfig {
  return {
    clipboard_enabled: els.clipboardToggle.checked,
  };
}

function isEqual(a: ClipboardLinksSettingsConfig, b: ClipboardLinksSettingsConfig): boolean {
  return a.clipboard_enabled === b.clipboard_enabled;
}

async function save(): Promise<void> {
  const current = readCurrent();

  try {
    if (!cache || !isEqual(current, cache)) {
      await invoke("save_settings", {
        clipboardEnabled: current.clipboard_enabled,
      });
      cache = current;
    }
    await invoke("save_link_handlers", { handlers: getLinkHandlers() });
    showStatus("设置已保存");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  initLinkHandlers();
  els.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });
  bound = true;
}

export async function initSettingsClipboardLinks(): Promise<void> {
  if (!cache) {
    const settings = await invoke<ClipboardLinksSettingsConfig>("get_settings");
    cache = {
      clipboard_enabled: settings.clipboard_enabled,
    };
    bindEvents();
  }
  render();
}
