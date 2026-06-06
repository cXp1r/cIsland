import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import type { GeneralSettingsConfig } from "./types";

const shortcutHint = "璇锋寜涓嬪揩鎹烽敭...";
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let cache: GeneralSettingsConfig | null = null;
let bound = false;
let isRecording = false;

function getEls() {
  return {
    shortcutInput: $<HTMLInputElement>("shortcut-input"),
    searchShortcutInput: $<HTMLInputElement>("search-shortcut-input"),
    hideAndSeeInput: $<HTMLInputElement>("hide-and-see-input"),
    indicatorColorInput: $<HTMLInputElement>("indicator-color"),
    autoStartToggle: $<HTMLInputElement>("auto-start-toggle"),
    saveBtn: $<HTMLButtonElement>("save-btn"),
  };
}

function active(): boolean {
  return document.getElementById("page-general")?.classList.contains("active") ?? false;
}

function render(): void {
  const e = getEls();
  e.shortcutInput.value = cache!.shortcut_key;
  e.searchShortcutInput.value = cache!.search_shortcut;
  e.hideAndSeeInput.value = cache!.hide_and_see_key;
  e.indicatorColorInput.value = cache!.indicator_color || "#2edb67";
  e.autoStartToggle.checked = cache!.auto_start;
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
  const e = getEls();
  const shortcuts = [e.shortcutInput, e.hideAndSeeInput, e.searchShortcutInput].map(checkShortcut);
  if (shortcuts.some((value) => !value)) return null;
  const [shortcutKey, hideAndSeeKey, searchShortcut] = shortcuts;

  return {
    shortcut_key: shortcutKey as string,
    hide_and_see_key: hideAndSeeKey as string,
    search_shortcut: searchShortcut as string,
    indicator_color: e.indicatorColorInput.value,
    auto_start: e.autoStartToggle.checked,
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
    showStatus("璁剧疆宸蹭繚瀛?");
  } catch (e) {
    showStatus(`淇濆瓨澶辫触: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  const e = getEls();
  [e.shortcutInput, e.hideAndSeeInput, e.searchShortcutInput].forEach(setupShortcutRecorder);
  e.saveBtn.addEventListener("click", () => {
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
