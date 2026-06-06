import { invoke } from "@tauri-apps/api/core";
import { getLogFilterTags, initLogFilter, setLogFilterTags } from "./log-filter";
import { $, showStatus } from "./shared";
import type { LogSettingsConfig } from "./types";

const els = {
  page: $<HTMLElement>("page-log"),
  logLevelSelect: $<HTMLSelectElement>("log-level-select"),
  logFilterInvertToggle: $<HTMLInputElement>("log-filter-invert"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: LogSettingsConfig | null = null;
let bound = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function render(): void {
  els.logLevelSelect.value = cache!.log_level || "info";
  els.logFilterInvertToggle.checked = cache!.log_filter_invert;
  setLogFilterTags(cache!.log_filter_tags);
}

function readCurrent(): LogSettingsConfig {
  return {
    log_level: els.logLevelSelect.value,
    log_filter_tags: getLogFilterTags(),
    log_filter_invert: els.logFilterInvertToggle.checked,
  };
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function isEqual(a: LogSettingsConfig, b: LogSettingsConfig): boolean {
  return a.log_level === b.log_level
    && a.log_filter_invert === b.log_filter_invert
    && sameArray(a.log_filter_tags, b.log_filter_tags);
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      logLevel: current.log_level,
      logFilterTags: current.log_filter_tags,
      logFilterInvert: current.log_filter_invert,
    });
    cache = current;
    showStatus("settings saved");
  } catch (e) {
    showStatus(`save failed: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  initLogFilter();
  els.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });
  bound = true;
}

export async function initSettingsLog(): Promise<void> {
  if (!cache) {
    const settings = await invoke<LogSettingsConfig>("get_settings");
    cache = {
      log_level: settings.log_level || "info",
      log_filter_tags: Array.isArray(settings.log_filter_tags) ? settings.log_filter_tags : [],
      log_filter_invert: settings.log_filter_invert,
    };
    bindEvents();
  }
  render();
}
