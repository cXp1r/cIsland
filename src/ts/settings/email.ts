import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { $ } from "../utils/shared";
import type { EmailSettingsConfig } from "./types";

const shortcutHint = "请按快捷键...";
const els = {
  page: $<HTMLElement>("page-email"),
  emailPollIntervalInput: $<HTMLInputElement>("email-poll-interval"),
  emailUsernameInput: $<HTMLInputElement>("email-username"),
  emailAuthInput: $<HTMLInputElement>("email-auth"),
  emailAddressInput: $<HTMLInputElement>("email-address"),
  emailPortInput: $<HTMLInputElement>("email-port"),
  emailShortcutInput: $<HTMLInputElement>("email-shortcut-input"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: EmailSettingsConfig | null = null;
let bound = false;
let isRecording = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function render(): void {
  els.emailPollIntervalInput.value = String(Math.max(1, cache!.email_poll_interval_secs || 1));
  els.emailUsernameInput.value = cache!.email_username || "";
  els.emailAuthInput.value = cache!.email_auth || "";
  els.emailAddressInput.value = cache!.email_address || "";
  els.emailPortInput.value = String(cache!.email_port || 993);
  els.emailShortcutInput.value = cache!.email_shortcut || "Ctrl+Alt+E";
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

function readCurrent(): EmailSettingsConfig | null {
  const emailShortcut = checkShortcut(els.emailShortcutInput);
  if (!emailShortcut) return null;

  return {
    email_poll_interval_secs: Math.max(1, Number.parseInt(els.emailPollIntervalInput.value) || 1),
    email_username: els.emailUsernameInput.value.trim(),
    email_auth: els.emailAuthInput.value.trim(),
    email_address: els.emailAddressInput.value.trim(),
    email_port: Number.parseInt(els.emailPortInput.value) || 993,
    email_shortcut: emailShortcut,
  };
}

function isEqual(a: EmailSettingsConfig, b: EmailSettingsConfig): boolean {
  return a.email_poll_interval_secs === b.email_poll_interval_secs
    && a.email_username === b.email_username
    && a.email_auth === b.email_auth
    && a.email_address === b.email_address
    && a.email_port === b.email_port
    && a.email_shortcut === b.email_shortcut;
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (!current) return;
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      emailPollIntervalSecs: current.email_poll_interval_secs,
      emailUsername: current.email_username,
      emailAuth: current.email_auth,
      emailAddress: current.email_address,
      emailPort: current.email_port,
      emailShortcut: current.email_shortcut,
    });
    cache = current;
    showStatus("设置已保存");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
  }
}

function bindEvents(): void {
  if (bound) return;
  setupShortcutRecorder(els.emailShortcutInput);
  els.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });
  bound = true;
}

export async function initSettingsEmail(): Promise<void> {
  if (!cache) {
    const settings = await invoke<EmailSettingsConfig>("get_settings");
    cache = {
      email_poll_interval_secs: settings.email_poll_interval_secs,
      email_username: settings.email_username || "",
      email_auth: settings.email_auth || "",
      email_address: settings.email_address || "",
      email_port: settings.email_port || 993,
      email_shortcut: settings.email_shortcut || "Ctrl+Alt+E",
    };
    bindEvents();
  }
  render();
}
