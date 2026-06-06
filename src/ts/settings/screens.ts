import { invoke } from "@tauri-apps/api/core";
import { getSelectedScreenId, initScreensFrame, setScreenData } from "./screens-frame";
import { showStatus } from "./shared";
import type { ScreensSettingsConfig } from "./types";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const els = {
  page: $<HTMLElement>("page-screens"),
  offsetX: $<HTMLInputElement>("offsetX"),
  offsetY: $<HTMLInputElement>("offsetY"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: ScreensSettingsConfig | null = null;
let bound = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function render(): void {
  setScreenData(cache!.monitor_info, cache!.primary_monitor_info);
  els.offsetX.value = String(cache!.offset_x);
  els.offsetY.value = String(cache!.offset_y);
  requestAnimationFrame(() => initScreensFrame());
}

function readCurrent() {
  return {
    offset_x: Number.parseInt(els.offsetX.value) || 0,
    offset_y: Number.parseInt(els.offsetY.value) || 0,
    monitor_id: getSelectedScreenId(),
  };
}

function isEqual(current: ReturnType<typeof readCurrent>, old: ScreensSettingsConfig): boolean {
  return current.offset_x === old.offset_x
    && current.offset_y === old.offset_y
    && (!current.monitor_id || current.monitor_id === old.primary_monitor_info.name);
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      offsetX: current.offset_x,
      offsetY: current.offset_y,
      monitorId: current.monitor_id,
    });
    const settings = await invoke<ScreensSettingsConfig>("get_settings");
    cache = {
      monitor_info: settings.monitor_info,
      primary_monitor_info: settings.primary_monitor_info,
      offset_x: current.offset_x,
      offset_y: current.offset_y,
    };
    showStatus("settings saved");
  } catch (e) {
    showStatus(`save failed: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  els.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });
  bound = true;
}

export async function initSettingsScreens(): Promise<void> {
  if (!cache) {
    const settings = await invoke<ScreensSettingsConfig>("get_settings");
    cache = {
      monitor_info: settings.monitor_info,
      primary_monitor_info: settings.primary_monitor_info,
      offset_x: settings.offset_x,
      offset_y: settings.offset_y,
    };
    bindEvents();
  }
  render();
}
