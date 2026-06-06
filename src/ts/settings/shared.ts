import { invoke } from "@tauri-apps/api/core";

export const INFLINK_URL = "https://docs.pyisland.com/guide/qa/ncm-music.html";

const statusEl = document.getElementById("status") as HTMLDivElement;
let statusTimer: number | null = null;

export function showStatus(msg: string, isError = false, durationMs = 2600) {
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#ff6f7f" : "#39d98a";
  statusTimer = window.setTimeout(() => {
    statusEl.textContent = "";
    statusTimer = null;
  }, durationMs);
}

export function openExternal(url: string) {
  void invoke("open_url", { url });
}
