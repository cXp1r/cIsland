import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { adbPath, sadbIpInput, sadbPortInput } from "./tools";
import type { SadbSettingsConfig } from "./types";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const els = {
  page: $<HTMLElement>("page-sadb"),
  sadbIpInput,
  sadbPortInput,
  adbPath,
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: SadbSettingsConfig | null = null;
let bound = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function clampPort(raw: string): number {
  const value = Number.parseInt(raw);
  if (!Number.isInteger(value) || value <= 0 || value >= 65535) return 5555;
  return value;
}

function render(): void {
  els.sadbIpInput.value = cache!.sadb_ip || "";
  els.sadbPortInput.value = String(cache!.sadb_port || 5555);
  els.adbPath.value = cache!.adb_path || "";
}

function readCurrent(): SadbSettingsConfig {
  return {
    sadb_ip: els.sadbIpInput.value.trim(),
    sadb_port: clampPort(els.sadbPortInput.value),
    adb_path: els.adbPath.value,
  };
}

function isEqual(a: SadbSettingsConfig, b: SadbSettingsConfig): boolean {
  return a.sadb_ip === b.sadb_ip
    && a.sadb_port === b.sadb_port
    && a.adb_path === b.adb_path;
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      sadbIp: current.sadb_ip,
      sadbPort: current.sadb_port,
      adbPath: current.adb_path,
    });
    cache = current;
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

export async function initSettingsSadb(): Promise<void> {
  if (!cache) {
    const settings = await invoke<SadbSettingsConfig>("get_settings");
    cache = {
      sadb_ip: settings.sadb_ip || "",
      sadb_port: settings.sadb_port || 5555,
      adb_path: settings.adb_path || "",
    };
    bindEvents();
  }
  render();
}
