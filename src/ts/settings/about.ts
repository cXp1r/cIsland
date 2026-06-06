import { invoke } from "@tauri-apps/api/core";
import { configDir } from "./main";
import { initUpdate } from "./update";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let bound = false;

function bindEvents(): void {
  if (bound) return;
  initUpdate();
  $<HTMLButtonElement>("open-cfg-btn").addEventListener("click", async () => {
    await invoke("open_path", { path: `${configDir}settings.json` });
  });
  bound = true;
}

export async function initSettingsAbout(): Promise<void> {
  bindEvents();
}
