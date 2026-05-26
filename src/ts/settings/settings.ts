import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import { initLyricOffset } from "./settings-lyric-offset";
import { init, setScreenData } from "./screens-frame";
import { showStatus } from "./settings-shared";
import { initAi, loadAiSettings, getAiValues } from "./settings-ai";
import { initBetterncm } from "./settings-betterncm";
import { initLinkHandlers, getLinkHandlers } from "./settings-link-handler";
import { initWeather, setWeatherCity } from "./settings-weather";
import { initUpdate } from "./settings-update";
import { initBlacklist } from "./settings-blacklist";
import { initSmtcWhitelist } from "./settings-smtc-whitelist";
import { initLogFilter, getLogFilterTags, setLogFilterTags } from "./settings-log-filter";
import type { SettingsResponse } from "./types";
import { saveToolsSettings, initTools } from "./tools";
const TAG = "Settings";

const clipboardToggle = document.getElementById("clipboard-toggle") as HTMLInputElement;
const shortcutInput = document.getElementById("shortcut-input") as HTMLInputElement;
const searchShortcutInput = document.getElementById("search-shortcut-input") as HTMLInputElement;
const hideAndSeeInput = document.getElementById("hide-and-see-input") as HTMLInputElement;
const lyricModeSelect = document.getElementById("lyric-mode") as HTMLSelectElement;
const lyricOffsetEnabledToggle = document.getElementById("lyric-offset-enabled") as HTMLInputElement;
const indicatorColorInput = document.getElementById("indicator-color") as HTMLInputElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const autoStartToggle = document.getElementById("auto-start-toggle") as HTMLInputElement;
const logLevelSelect = document.getElementById("log-level-select") as HTMLSelectElement | null;
const logFilterInvertToggle = document.getElementById("log-filter-invert") as HTMLInputElement | null;

const offsetX = document.getElementById("offsetX") as HTMLInputElement;
const offsetY = document.getElementById("offsetY") as HTMLInputElement;
const agentWindowSizeSelect = document.getElementById("agent-window-size") as HTMLSelectElement;

const emailPollIntervalInput = document.getElementById("email-poll-interval") as HTMLInputElement;
const emailUsernameInput = document.getElementById("email-username") as HTMLInputElement;
const emailAuthInput = document.getElementById("email-auth") as HTMLInputElement;
const emailAddressInput = document.getElementById("email-address") as HTMLInputElement;
const emailPortInput = document.getElementById("email-port") as HTMLInputElement;
const emailShortcutInput = document.getElementById("email-shortcut-input") as HTMLInputElement;

let isRecording = false;
const shortcutHint = "请按下快捷键...";

async function loadSettings() {
  const settings = await invoke<SettingsResponse>("get_settings");
  init();
  setScreenData(settings.monitor_info, settings.primary_monitor_info);
  offsetX.value = String(settings.offset_x);
  offsetY.value = String(settings.offset_y);
  clipboardToggle.checked = settings.clipboard_enabled;
  shortcutInput.value = settings.shortcut_key;
  searchShortcutInput.value = settings.search_shortcut;
  hideAndSeeInput.value = settings.hide_and_see_key;
  lyricModeSelect.value = settings.lyric_mode || "lyric";
  lyricOffsetEnabledToggle.checked = settings.lyric_offset_enabled ?? true;
  indicatorColorInput.value = settings.indicator_color || "#2edb67";
  agentWindowSizeSelect.value = settings.agent_window_size || "medium";
  emailPollIntervalInput.value = Math.max(1, settings.email_poll_interval_secs || 1).toString();
  emailUsernameInput.value = settings.email_username || "";
  emailAuthInput.value = settings.email_auth || "";
  emailAddressInput.value = settings.email_address || "";
  emailPortInput.value = (settings.email_port || 993).toString();
  emailShortcutInput.value = settings.email_shortcut || "Ctrl+Alt+E";
  autoStartToggle.checked = settings.auto_start || false;

  if (logLevelSelect) {
    logLevelSelect.value = settings.log_level || "info";
  }
  if (logFilterInvertToggle) {
    logFilterInvertToggle.checked = settings.log_filter_invert || false;
  }
  setLogFilterTags(settings.log_filter_tags);

  // 天气城市
  if (settings.weather_city) {
    setWeatherCity(settings.weather_city);
  }

  void loadAiSettings();
}

function setupShortcutRecorder(input: HTMLInputElement) {
  input.addEventListener("click", () => {
    isRecording = true;
    input.value = shortcutHint;
    input.classList.add("recording");
  });

  input.addEventListener("blur", () => {
    if (!isRecording) return;
    isRecording = false;
    input.classList.remove("recording");
    void loadSettings();
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

[shortcutInput, hideAndSeeInput, searchShortcutInput, emailShortcutInput].forEach(setupShortcutRecorder);

initLyricOffset();

function check_shortcut(e: HTMLInputElement) {
  if (!e) return false;
  const value = e.value.trim();
  if (!value || value === shortcutHint) {
    return false;
  }
  return value;
}

saveBtn.addEventListener("click", async () => {
  const results = [shortcutInput, hideAndSeeInput, searchShortcutInput, emailShortcutInput]
    .map((e: HTMLInputElement) => check_shortcut(e));
  if (results.some(q => !q)) return;
  const [q1, q2, q3, q4] = results;

  try {
    await invoke("save_settings", {
      offsetX: parseInt(offsetX.value) || 0,
      offsetY: parseInt(offsetY.value) || 0,
      monitorId: document.querySelector('.screen-div.selected')?.id,
      clipboardEnabled: clipboardToggle.checked,
      shortcutKey: q1,
      hideAndSeeKey: q2,
      searchShortcut: q3,
      lyricMode: lyricModeSelect.value,
      lyricOffsetEnabled: lyricOffsetEnabledToggle.checked,
      indicatorColor: indicatorColorInput.value,
      agentWindowSize: agentWindowSizeSelect.value,
      autoStart: autoStartToggle.checked,
      logLevel: logLevelSelect ? logLevelSelect.value : undefined,
      logFilterTags: getLogFilterTags(),
      logFilterInvert: logFilterInvertToggle ? logFilterInvertToggle.checked : undefined,
      emailPollIntervalSecs: Math.max(1, parseInt(emailPollIntervalInput.value) || 1),
      emailUsername: emailUsernameInput.value.trim(),
      emailAuth: emailAuthInput.value.trim(),
      emailAddress: emailAddressInput.value.trim(),
      emailPort: parseInt(emailPortInput.value) || 993,
      emailShortcut: q4,
    });

    await saveToolsSettings();

    // 保存 AI 设置
    const aiValues = getAiValues();
    const aiModelTypeResult = document.getElementById("ai-model-type-result") as HTMLParagraphElement;

    if (aiValues.apiUrl || aiValues.apiKey || aiValues.model) {
      await invoke("ai_save_settings", {
        apiUrl: aiValues.apiUrl,
        apiKey: aiValues.apiKey,
        model: aiValues.model,
      });
      await emit("ai-settings-changed", {});
    }

    if (aiValues.apiUrl && aiValues.apiKey && aiValues.model) {
      aiModelTypeResult.textContent = "检测中...";
      aiModelTypeResult.style.color = "#93a4c8";
      try {
        await invoke("ai_detect_model_type");
      } catch {
        aiModelTypeResult.textContent = "检测失败";
        aiModelTypeResult.style.color = "#ff6f7f";
      }
    }

    // 保存链接处理器
    await invoke("save_link_handlers", { handlers: getLinkHandlers() });

    showStatus("设置已保存");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
  }
});

// ==================== 窗口调整大小 ====================

const appWindow = getCurrentWindow();
let isResizing = false;
let resizeDirection = "";
let startX = 0, startY = 0;
let startWidth = 0, startHeight = 0;
let startPosX = 0, startPosY = 0;

const resizeHandles = document.querySelectorAll(".resize-handle");

resizeHandles.forEach((handle) => {
  handle.addEventListener("mousedown", async (e: Event) => {
    const mouseEvent = e as MouseEvent;
    e.preventDefault();
    isResizing = true;
    resizeDirection = (handle as HTMLElement).dataset.direction || "";
    startX = mouseEvent.screenX;
    startY = mouseEvent.screenY;

    const size = await appWindow.outerSize();
    const position = await appWindow.outerPosition();
    startWidth = size.width;
    startHeight = size.height;
    startPosX = position.x;
    startPosY = position.y;
  });
});

document.addEventListener("mousemove", async (e: MouseEvent) => {
  if (!isResizing) return;

  const deltaX = e.screenX - startX;
  const deltaY = e.screenY - startY;

  let newWidth = startWidth;
  let newHeight = startHeight;
  let newX = startPosX;
  let newY = startPosY;

  const minWidth = 600;
  const minHeight = 400;

  if (resizeDirection.includes("e")) {
    newWidth = Math.max(minWidth, startWidth + deltaX);
  }
  if (resizeDirection.includes("w")) {
    const proposedWidth = startWidth - deltaX;
    if (proposedWidth >= minWidth) {
      newWidth = proposedWidth;
      newX = startPosX + deltaX;
    }
  }
  if (resizeDirection.includes("s")) {
    newHeight = Math.max(minHeight, startHeight + deltaY);
  }
  if (resizeDirection.includes("n")) {
    const proposedHeight = startHeight - deltaY;
    if (proposedHeight >= minHeight) {
      newHeight = proposedHeight;
      newY = startPosY + deltaY;
    }
  }

  try {
    await appWindow.setSize(new LogicalSize(newWidth, newHeight));
    if (newX !== startPosX || newY !== startPosY) {
      await appWindow.setPosition(new LogicalPosition(newX, newY));
    }
  } catch (err) {
    console.error(TAG, "resize settings window failed:", err);
  }
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  resizeDirection = "";
});

// ==================== 初始化所有模块 ====================

void loadSettings();

initTools();
initAi();
initBetterncm();
initLinkHandlers();
initWeather();
initUpdate();
initBlacklist();
initSmtcWhitelist();
initLogFilter();
