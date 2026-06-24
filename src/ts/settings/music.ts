import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { $ } from "../utils/shared";
import type { MusicSettingsConfig } from "./types";

const els = {
  page: $<HTMLElement>("page-music"),
  lyricModeSelect: $<HTMLSelectElement>("lyric-mode"),
  lyricOffsetEnabledToggle: $<HTMLInputElement>("lyric-offset-enabled"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: MusicSettingsConfig | null = null;
let bound = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function render(): void {
  els.lyricModeSelect.value = cache!.lyric_mode || "lyric";
  els.lyricOffsetEnabledToggle.checked = cache!.lyric_offset_enabled;
}

function readCurrent(): MusicSettingsConfig {
  return {
    lyric_mode: els.lyricModeSelect.value,
    lyric_offset_enabled: els.lyricOffsetEnabledToggle.checked,
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
    showStatus("设置已保存");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  els.saveBtn.addEventListener("click", () => {
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
