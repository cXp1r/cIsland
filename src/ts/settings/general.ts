import { invoke } from "@tauri-apps/api/core";
import { $, showStatus } from "./shared";
import type { GeneralSettingsConfig } from "./types";

const shortcutHint = "Press shortcut...";
const els = {
  page: $<HTMLElement>("page-general"),
  shortcutInput: $<HTMLInputElement>("shortcut-input"),
  searchShortcutInput: $<HTMLInputElement>("search-shortcut-input"),
  hideAndSeeInput: $<HTMLInputElement>("hide-and-see-input"),
  indicatorColorInput: $<HTMLInputElement>("indicator-color"),
  autoStartToggle: $<HTMLInputElement>("auto-start-toggle"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: GeneralSettingsConfig | null = null;
let bound = false;
let isRecording = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function render(): void {
  els.shortcutInput.value = cache!.shortcut_key;
  els.searchShortcutInput.value = cache!.search_shortcut;
  els.hideAndSeeInput.value = cache!.hide_and_see_key;
  els.indicatorColorInput.value = cache!.indicator_color || "#2edb67";
  els.autoStartToggle.checked = cache!.auto_start;
}

function setupShortcutRecorder(input: HTMLInputElement): void {
  input.addEventListener("click", () => {
    isRecording = true;
    input.value = shortcutHint;
    input.classList.add("recording");
  });

  input.addEventListener("blur", () => {
    if (!isRecording) return;
    isRecording = false;
    input.classList.remove("recording");
    render();
  });

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Super");

    const ignored = ["Control", "Alt", "Shift", "Meta"];
    if (!ignored.includes(e.key)) {
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      input.value = parts.join("+");
      input.classList.remove("recording");
      isRecording = false;
    }
  });
}

function checkShortcut(input: HTMLInputElement): string | false {
  const value = input.value.trim();
  if (!value || value === shortcutHint) return false;
  return value;
}

function readCurrent(): GeneralSettingsConfig | null {
  const shortcuts = [els.shortcutInput, els.hideAndSeeInput, els.searchShortcutInput].map(checkShortcut);
  if (shortcuts.some((value) => !value)) return null;
  const [shortcutKey, hideAndSeeKey, searchShortcut] = shortcuts;

  return {
    shortcut_key: shortcutKey as string,
    hide_and_see_key: hideAndSeeKey as string,
    search_shortcut: searchShortcut as string,
    indicator_color: els.indicatorColorInput.value,
    auto_start: els.autoStartToggle.checked,
  };
}

function isEqual(a: GeneralSettingsConfig, b: GeneralSettingsConfig): boolean {
  return a.shortcut_key === b.shortcut_key
    && a.hide_and_see_key === b.hide_and_see_key
    && a.search_shortcut === b.search_shortcut
    && a.indicator_color === b.indicator_color
    && a.auto_start === b.auto_start;
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (!current) return;
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      shortcutKey: current.shortcut_key,
      hideAndSeeKey: current.hide_and_see_key,
      searchShortcut: current.search_shortcut,
      indicatorColor: current.indicator_color,
      autoStart: current.auto_start,
    });
    cache = current;
    showStatus("settings saved");
  } catch (e) {
    showStatus(`save failed: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  [els.shortcutInput, els.hideAndSeeInput, els.searchShortcutInput].forEach(setupShortcutRecorder);
  els.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });
  bound = true;
}

export async function initSettingsGeneral(): Promise<void> {
  if (!cache) {
    const settings = await invoke<GeneralSettingsConfig>("get_settings");
    cache = {
      shortcut_key: settings.shortcut_key,
      hide_and_see_key: settings.hide_and_see_key,
      search_shortcut: settings.search_shortcut,
      indicator_color: settings.indicator_color,
      auto_start: settings.auto_start,
    };
    bindEvents();
  }
  render();
}
