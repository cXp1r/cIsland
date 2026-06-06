import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { getLogFilterTags, initLogFilter, setLogFilterTags } from "./log-filter";
import type { LogSettingsConfig } from "./types";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let cache: LogSettingsConfig | null = null;
let bound = false;

function getEls() {
  return {
    logLevelSelect: $<HTMLSelectElement>("log-level-select"),
    logFilterInvertToggle: $<HTMLInputElement>("log-filter-invert"),
    saveBtn: $<HTMLButtonElement>("save-btn"),
  };
}

function active(): boolean {
  return document.getElementById("page-log")?.classList.contains("active") ?? false;
}

function render(): void {
  const e = getEls();
  e.logLevelSelect.value = cache!.log_level || "info";
  e.logFilterInvertToggle.checked = cache!.log_filter_invert;
  setLogFilterTags(cache!.log_filter_tags);
}

function readCurrent(): LogSettingsConfig {
  const e = getEls();
  return {
    log_level: e.logLevelSelect.value,
    log_filter_tags: getLogFilterTags(),
    log_filter_invert: e.logFilterInvertToggle.checked,
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
    showStatus("璁剧疆宸蹭繚瀛?");
  } catch (e) {
    showStatus(`淇濆瓨澶辫触: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  initLogFilter();
  getEls().saveBtn.addEventListener("click", () => {
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
