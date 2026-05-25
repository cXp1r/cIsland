import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { showStatus } from "./settings-shared";
import { loge } from "../index/logger";
import type { AISettingsResponse } from "./types";

const TAG = "Settings/AI";

const aiApiUrlInput = document.getElementById("ai-api-url") as HTMLInputElement;
const aiApiKeyInput = document.getElementById("ai-api-key") as HTMLInputElement;
const aiModelInput = document.getElementById("ai-model") as HTMLInputElement;
const aiDetectBtn = document.getElementById("ai-detect-btn") as HTMLButtonElement;
const aiModelTypeResult = document.getElementById("ai-model-type-result") as HTMLParagraphElement;

export function getAiValues() {
  return {
    apiUrl: aiApiUrlInput.value.trim(),
    apiKey: aiApiKeyInput.value.trim(),
    model: aiModelInput.value.trim(),
  };
}

export async function loadAiSettings(): Promise<void> {
  try {
    const aiSettings = await invoke<AISettingsResponse>("ai_get_settings");
    aiApiUrlInput.value = aiSettings.api_url || "";
    aiApiKeyInput.value = aiSettings.api_key || "";
    aiModelInput.value = aiSettings.model || "";

    if (aiSettings.is_reasoning_model) {
      aiModelTypeResult.textContent = "✅ 思考模型";
      aiModelTypeResult.style.color = "#39d98a";
    } else if (aiSettings.model) {
      aiModelTypeResult.textContent = "普通模型";
      aiModelTypeResult.style.color = "#93a4c8";
    } else {
      aiModelTypeResult.textContent = "未检测";
      aiModelTypeResult.style.color = "#93a4c8";
    }
  } catch (e) {
    loge(TAG, "load ai settings failed:", e);
  }
}

export function initAi(): void {
  aiDetectBtn.addEventListener("click", async () => {
    const apiUrl = aiApiUrlInput.value.trim();
    const apiKey = aiApiKeyInput.value.trim();
    const model = aiModelInput.value.trim();

    if (!apiUrl || !apiKey || !model) {
      showStatus("请先填写完整的 AI 配置", true);
      return;
    }

    aiDetectBtn.disabled = true;
    aiDetectBtn.textContent = "检测中...";
    aiModelTypeResult.textContent = "检测中...";
    aiModelTypeResult.style.color = "#93a4c8";

    try {
      await invoke("ai_save_settings", { apiUrl, apiKey, model });
      await invoke("ai_detect_model_type");
      showStatus("模型检测已发起，请稍候...");
    } catch (e) {
      aiModelTypeResult.textContent = "检测失败";
      aiModelTypeResult.style.color = "#ff6f7f";
      showStatus(`检测失败: ${String(e)}`, true, 4500);
    } finally {
      aiDetectBtn.disabled = false;
      aiDetectBtn.textContent = "检测模型类型";
    }
  });

  listen<{ is_reasoning_model: boolean }>("ai-model-type-detected", (event) => {
    const result = event.payload;
    if (result.is_reasoning_model) {
      aiModelTypeResult.textContent = "✅ 思考模型";
      aiModelTypeResult.style.color = "#39d98a";
      showStatus("检测完成：这是一个思考模型");
    } else {
      aiModelTypeResult.textContent = "普通模型";
      aiModelTypeResult.style.color = "#93a4c8";
      showStatus("检测完成：这是一个普通模型");
    }
    void emit("ai-settings-changed", {});
  });
}
