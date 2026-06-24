import { invoke } from "@tauri-apps/api/core";
import { loge } from "../utils/logger";
import { showStatus } from "./shared";
import type { LinkHandler } from "./types";

const TAG = "Settings/LinkHandler";

const linkHandlersList = document.getElementById("link-handlers-list") as HTMLDivElement;
const addHandlerBtn = document.getElementById("add-handler-btn") as HTMLButtonElement;
const handlerDetailPage = document.getElementById("handler-detail-page") as HTMLDivElement;
const handlerDetailBack = document.getElementById("handler-detail-back") as HTMLButtonElement;
const handlerDetailTitle = document.getElementById("handler-detail-title") as HTMLHeadingElement;
const handlerDetailSave = document.getElementById("handler-detail-save") as HTMLButtonElement;
const handlerDetailDelete = document.getElementById("handler-detail-delete") as HTMLButtonElement;
const testAppBtn = document.getElementById("test-app-btn") as HTMLButtonElement;
const detailName = document.getElementById("detail-name") as HTMLInputElement;
const detailPattern = document.getElementById("detail-pattern") as HTMLInputElement;
const detailAppPath = document.getElementById("detail-app-path") as HTMLInputElement;

let linkHandlers: LinkHandler[] = [];
let editingHandlerIndex: number = -1;

export function getLinkHandlers(): LinkHandler[] {
  return linkHandlers;
}

export async function loadLinkHandlers(): Promise<void> {
  try {
    linkHandlers = await invoke<LinkHandler[]>("get_link_handlers");
    renderLinkHandlersList();
  } catch (e) {
    loge(TAG, "load link handlers failed:", e);
  }
}

function renderLinkHandlersList() {
  linkHandlersList.innerHTML = "";

  if (linkHandlers.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.style.color = "var(--text-muted)";
    emptyMsg.style.fontSize = "13px";
    emptyMsg.textContent = "暂无处理器，点击下方按钮添加。";
    linkHandlersList.appendChild(emptyMsg);
    return;
  }

  linkHandlers.forEach((handler, index) => {
    const item = document.createElement("div");
    item.className = "handler-list-item";

    const info = document.createElement("div");
    info.className = "handler-list-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "handler-list-name" + (handler.name ? "" : " empty");
    nameSpan.textContent = handler.name || "未命名处理器";
    info.appendChild(nameSpan);

    const status = document.createElement("span");
    status.className = "handler-list-status" + (handler.enabled ? " active" : "");
    status.textContent = handler.enabled ? "已启用" : "已禁用";
    info.appendChild(status);

    item.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "handler-list-actions";

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    switchLabel.style.transform = "scale(0.8)";

    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = handler.enabled;
    toggleInput.addEventListener("change", () => {
      linkHandlers[index].enabled = toggleInput.checked;
    });
    switchLabel.appendChild(toggleInput);

    const slider = document.createElement("span");
    slider.className = "slider";
    switchLabel.appendChild(slider);

    actions.appendChild(switchLabel);

    const configBtn = document.createElement("button");
    configBtn.className = "btn btn-small";
    configBtn.textContent = "配置";
    configBtn.addEventListener("click", () => {
      openHandlerDetail(index);
    });
    actions.appendChild(configBtn);

    item.appendChild(actions);
    linkHandlersList.appendChild(item);
  });
}

function openHandlerDetail(index: number) {
  editingHandlerIndex = index;
  const handler = linkHandlers[index];

  detailName.value = handler.name;
  detailPattern.value = handler.pattern;
  detailAppPath.value = handler.app_path;

  handlerDetailTitle.textContent = handler.name || "配置处理器";
  handlerDetailPage.classList.add("active");
}

function closeHandlerDetail() {
  handlerDetailPage.classList.remove("active");
  editingHandlerIndex = -1;
}

export function initLinkHandlers(): void {
  handlerDetailBack.addEventListener("click", () => {
    closeHandlerDetail();
  });

  handlerDetailSave.addEventListener("click", () => {
    if (editingHandlerIndex < 0 || editingHandlerIndex >= linkHandlers.length) {
      return;
    }

    linkHandlers[editingHandlerIndex].name = detailName.value.trim();
    linkHandlers[editingHandlerIndex].pattern = detailPattern.value.trim();
    linkHandlers[editingHandlerIndex].app_path = detailAppPath.value.trim();

    renderLinkHandlersList();
    closeHandlerDetail();
    showStatus("处理器已更新");
  });

  handlerDetailDelete.addEventListener("click", () => {
    if (editingHandlerIndex < 0 || editingHandlerIndex >= linkHandlers.length) {
      return;
    }

    linkHandlers.splice(editingHandlerIndex, 1);
    renderLinkHandlersList();
    closeHandlerDetail();
    showStatus("处理器已删除");
  });

  testAppBtn.addEventListener("click", async () => {
    const appPath = detailAppPath.value.trim();

    if (!appPath) {
      showStatus("请先填写应用路径", true);
      return;
    }

    testAppBtn.disabled = true;
    testAppBtn.textContent = "测试中...";

    try {
      await invoke("test_link_handler", { appPath });
      showStatus("应用启动成功");
    } catch (e) {
      showStatus(`启动失败: ${String(e)}`, true, 4500);
    } finally {
      testAppBtn.disabled = false;
      testAppBtn.textContent = "测试打开";
    }
  });

  addHandlerBtn.addEventListener("click", () => {
    const newHandler: LinkHandler = {
      id: `handler-${Date.now()}`,
      name: "",
      pattern: "",
      app_path: "",
      enabled: true,
    };
    linkHandlers.push(newHandler);
    openHandlerDetail(linkHandlers.length - 1);
  });

  void loadLinkHandlers();
}
