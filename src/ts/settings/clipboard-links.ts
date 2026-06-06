import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { getLinkHandlers, initLinkHandlers } from "./link-handler";
import type { ClipboardLinksSettingsConfig } from "./types";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let cache: ClipboardLinksSettingsConfig | null = null;
let bound = false;

function getEls() {
  return {
    clipboardToggle: $<HTMLInputElement>("clipboard-toggle"),
    saveBtn: $<HTMLButtonElement>("save-btn"),
  };
}

function active(): boolean {
  return document.getElementById("page-clipboard-links")?.classList.contains("active") ?? false;
}

function render(): void {
  getEls().clipboardToggle.checked = cache!.clipboard_enabled;
}

function readCurrent(): ClipboardLinksSettingsConfig {
  return {
    clipboard_enabled: getEls().clipboardToggle.checked,
  };
}

function isEqual(a: ClipboardLinksSettingsConfig, b: ClipboardLinksSettingsConfig): boolean {
  return a.clipboard_enabled === b.clipboard_enabled;
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (cache && isEqual(current, cache)) {
    await invoke("save_link_handlers", { handlers: getLinkHandlers() });
    showStatus("settings saved");
    return;
  }

  try {
    await invoke("save_settings", {
      clipboardEnabled: current.clipboard_enabled,
    });
    await invoke("save_link_handlers", { handlers: getLinkHandlers() });
    cache = current;
    showStatus("settings saved");
  } catch (e) {
    showStatus(`save failed: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  initLinkHandlers();
  getEls().saveBtn.addEventListener("click", () => {
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
