import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { loge } from "../index/logger";
import { showStatus } from "./shared";
import type { AISettingsResponse, AiWindowSettingsConfig } from "./types";

const TAG = "Settings/AI";
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let cache: (AISettingsResponse & AiWindowSettingsConfig) | null = null;
let bound = false;

function getEls() {
  return {
    apiUrl: $<HTMLInputElement>("ai-api-url"),
    apiKey: $<HTMLInputElement>("ai-api-key"),
    model: $<HTMLInputElement>("ai-model"),
    detectBtn: $<HTMLButtonElement>("ai-detect-btn"),
    result: $<HTMLParagraphElement>("ai-model-type-result"),
    windowSize: $<HTMLSelectElement>("agent-window-size"),
    saveBtn: $<HTMLButtonElement>("save-btn"),
  };
}

function active(): boolean {
  return document.getElementById("page-ai")?.classList.contains("active") ?? false;
}

function readAi() {
  const e = getEls();
  return {
    apiUrl: e.apiUrl.value.trim(),
    apiKey: e.apiKey.value.trim(),
    model: e.model.value.trim(),
  };
}

function renderResult(): void {
  const e = getEls();
  if (cache!.is_reasoning_model) {
    e.result.textContent = "reasoning model";
    e.result.style.color = "#39d98a";
  } else if (cache!.model) {
    e.result.textContent = "normal model";
    e.result.style.color = "#93a4c8";
  } else {
    e.result.textContent = "not detected";
    e.result.style.color = "#93a4c8";
  }
}

function render(): void {
  const e = getEls();
  e.apiUrl.value = cache!.api_url || "";
  e.apiKey.value = cache!.api_key || "";
  e.model.value = cache!.model || "";
  e.windowSize.value = cache!.agent_window_size || "medium";
  renderResult();
}

async function save(): Promise<void> {
  const e = getEls();
  const ai = readAi();

  try {
    if (ai.apiUrl || ai.apiKey || ai.model) {
      await invoke("ai_save_settings", {
        apiUrl: ai.apiUrl,
        apiKey: ai.apiKey,
        model: ai.model,
      });
      await emit("ai-settings-changed", {});
    }

    await invoke("save_settings", {
      agentWindowSize: e.windowSize.value,
    });

    cache = {
      api_url: ai.apiUrl,
      api_key: ai.apiKey,
      model: ai.model,
      is_reasoning_model: cache?.is_reasoning_model ?? false,
      agent_window_size: e.windowSize.value,
    };

    if (ai.apiUrl && ai.apiKey && ai.model) {
      e.result.textContent = "detecting...";
      e.result.style.color = "#93a4c8";
      try {
        await invoke("ai_detect_model_type");
      } catch {
        e.result.textContent = "detect failed";
        e.result.style.color = "#ff6f7f";
      }
    }

    showStatus("settings saved");
  } catch (err) {
    showStatus(`save failed: ${String(err)}`, true, 4500);
  }
}

async function detect(): Promise<void> {
  const e = getEls();
  const ai = readAi();

  if (!ai.apiUrl || !ai.apiKey || !ai.model) {
    showStatus("Please fill AI settings first.", true);
    return;
  }

  e.detectBtn.disabled = true;
  e.detectBtn.textContent = "detecting...";
  e.result.textContent = "detecting...";
  e.result.style.color = "#93a4c8";

  try {
    await invoke("ai_save_settings", {
      apiUrl: ai.apiUrl,
      apiKey: ai.apiKey,
      model: ai.model,
    });
    await invoke("ai_detect_model_type");
    showStatus("model detection started");
  } catch (err) {
    e.result.textContent = "detect failed";
    e.result.style.color = "#ff6f7f";
    showStatus(`detect failed: ${String(err)}`, true, 4500);
  } finally {
    e.detectBtn.disabled = false;
    e.detectBtn.textContent = "detect model type";
  }
}

function bindEvents(): void {
  if (bound) return;
  const e = getEls();

  e.detectBtn.addEventListener("click", () => void detect());
  e.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });

  void listen<{ is_reasoning_model: boolean }>("ai-model-type-detected", (event) => {
    if (cache) cache.is_reasoning_model = event.payload.is_reasoning_model;
    renderResult();
    showStatus(event.payload.is_reasoning_model ? "detected: reasoning model" : "detected: normal model");
    void emit("ai-settings-changed", {});
  });

  bound = true;
}

export async function initSettingsAi(): Promise<void> {
  if (!cache) {
    try {
      const [ai, settings] = await Promise.all([
        invoke<AISettingsResponse>("ai_get_settings"),
        invoke<AiWindowSettingsConfig>("get_settings"),
      ]);
      cache = {
        ...ai,
        agent_window_size: settings.agent_window_size || "medium",
      };
    } catch (err) {
      loge(TAG, "load ai settings failed:", err);
      cache = {
        api_url: "",
        api_key: "",
        model: "",
        is_reasoning_model: false,
        agent_window_size: "medium",
      };
    }
    bindEvents();
  }
  render();
}
