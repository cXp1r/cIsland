import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import type { MusicSettingsConfig } from "./types";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let cache: MusicSettingsConfig | null = null;
let bound = false;

function getEls() {
  return {
    lyricModeSelect: $<HTMLSelectElement>("lyric-mode"),
    lyricOffsetEnabledToggle: $<HTMLInputElement>("lyric-offset-enabled"),
    saveBtn: $<HTMLButtonElement>("save-btn"),
  };
}

function active(): boolean {
  return document.getElementById("page-music")?.classList.contains("active") ?? false;
}

function render(): void {
  const e = getEls();
  e.lyricModeSelect.value = cache!.lyric_mode || "lyric";
  e.lyricOffsetEnabledToggle.checked = cache!.lyric_offset_enabled;
}

function readCurrent(): MusicSettingsConfig {
  const e = getEls();
  return {
    lyric_mode: e.lyricModeSelect.value,
    lyric_offset_enabled: e.lyricOffsetEnabledToggle.checked,
  };
}

function isEqual(a: MusicSettingsConfig, b: MusicSettingsConfig): boolean {
  return a.lyric_mode === b.lyric_mode
    && a.lyric_offset_enabled === b.lyric_offset_enabled;
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      lyricMode: current.lyric_mode,
      lyricOffsetEnabled: current.lyric_offset_enabled,
    });
    cache = current;
    showStatus("璁剧疆宸蹭繚瀛?");
  } catch (e) {
    showStatus(`淇濆瓨澶辫触: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  getEls().saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });
  bound = true;
}

export async function initSettingsMusic(): Promise<void> {
  if (!cache) {
    const settings = await invoke<MusicSettingsConfig>("get_settings");
    cache = {
      lyric_mode: settings.lyric_mode || "lyric",
      lyric_offset_enabled: settings.lyric_offset_enabled,
    };
    bindEvents();
  }
  render();
}
