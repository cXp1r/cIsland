import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { loge } from "../index/logger";
import { showStatus } from "./shared";
import { $ } from "../shared";
import type { AISettingsResponse, AiWindowSettingsConfig } from "./types";

const TAG = "Settings/AI";
const els = {
  page: $<HTMLElement>("page-ai"),
  apiUrl: $<HTMLInputElement>("ai-api-url"),
  apiKey: $<HTMLInputElement>("ai-api-key"),
  model: $<HTMLInputElement>("ai-model"),
  detectBtn: $<HTMLButtonElement>("ai-detect-btn"),
  result: $<HTMLParagraphElement>("ai-model-type-result"),
  windowSize: $<HTMLSelectElement>("agent-window-size"),
  saveBtn: $<HTMLButtonElement>("save-btn"),
};

let cache: (AISettingsResponse & AiWindowSettingsConfig) | null = null;
let bound = false;

function active(): boolean {
  return els.page.classList.contains("active");
}

function readAi() {
  return {
    apiUrl: els.apiUrl.value.trim(),
    apiKey: els.apiKey.value.trim(),
    model: els.model.value.trim(),
  };
}

function renderResult(): void {
  if (cache!.is_reasoning_model) {
    els.result.textContent = "推理模型";
    els.result.style.color = "#39d98a";
  } else if (cache!.model) {
    els.result.textContent = "普通模型";
    els.result.style.color = "#93a4c8";
  } else {
    els.result.textContent = "未检测";
    els.result.style.color = "#93a4c8";
  }
}

function render(): void {
  els.apiUrl.value = cache!.api_url || "";
  els.apiKey.value = cache!.api_key || "";
  els.model.value = cache!.model || "";
  els.windowSize.value = cache!.agent_window_size || "medium";
  renderResult();
}

async function save(): Promise<void> {
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
      agentWindowSize: els.windowSize.value,
    });

    cache = {
      api_url: ai.apiUrl,
      api_key: ai.apiKey,
      model: ai.model,
      is_reasoning_model: cache?.is_reasoning_model ?? false,
      agent_window_size: els.windowSize.value,
    };

    if (ai.apiUrl && ai.apiKey && ai.model) {
      els.result.textContent = "检测中...";
      els.result.style.color = "#93a4c8";
      try {
        await invoke("ai_detect_model_type");
      } catch {
        els.result.textContent = "检测失败";
        els.result.style.color = "#ff6f7f";
      }
    }

    showStatus("设置已保存");
  } catch (err) {
    showStatus(`保存失败: ${String(err)}`, true, 4500);
  }
}

async function detect(): Promise<void> {
  const ai = readAi();

  if (!ai.apiUrl || !ai.apiKey || !ai.model) {
    showStatus("请先填写 AI 设置。", true);
    return;
  }

  els.detectBtn.disabled = true;
  els.detectBtn.textContent = "检测中...";
  els.result.textContent = "检测中...";
  els.result.style.color = "#93a4c8";

  try {
    await invoke("ai_save_settings", {
      apiUrl: ai.apiUrl,
      apiKey: ai.apiKey,
      model: ai.model,
    });
    await invoke("ai_detect_model_type");
    showStatus("模型检测已开始");
  } catch (err) {
    els.result.textContent = "检测失败";
    els.result.style.color = "#ff6f7f";
    showStatus(`检测失败: ${String(err)}`, true, 4500);
  } finally {
    els.detectBtn.disabled = false;
    els.detectBtn.textContent = "检测模型类型";
  }
}

function bindEvents(): void {
  if (bound) return;

  els.detectBtn.addEventListener("click", () => void detect());
  els.saveBtn.addEventListener("click", () => {
    if (active()) void save();
  });

  void listen<{ is_reasoning_model: boolean }>("ai-model-type-detected", (event) => {
    if (cache) cache.is_reasoning_model = event.payload.is_reasoning_model;
    renderResult();
    showStatus(event.payload.is_reasoning_model ? "已检测为推理模型" : "已检测为普通模型");
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
