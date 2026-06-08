import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { showStatus } from "./shared";
import { userDir } from "./main";
import type { Aria2cRpcEnd, Aria2cRpcProgress } from "./types";

function cancelIconSvg(id: string): string {
  const gradientIdA = `close-gradient-a-${id}`;
  const gradientIdB = `close-gradient-b-${id}`;
  return `
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true"><linearGradient id="${gradientIdA}" x1="7.534" x2="27.557" y1="7.534" y2="27.557" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f44f5a"/><stop offset=".443" stop-color="#ee3d4a"/><stop offset="1" stop-color="#e52030"/></linearGradient><path fill="url(#${gradientIdA})" d="M42.42,12.401c0.774-0.774,0.774-2.028,0-2.802L38.401,5.58c-0.774-0.774-2.028-0.774-2.802,0 L24,17.179L12.401,5.58c-0.774-0.774-2.028-0.774-2.802,0L5.58,9.599c-0.774,0.774-0.774,2.028,0,2.802L17.179,24L5.58,35.599 c-0.774,0.774-0.774,2.028,0,2.802l4.019,4.019c0.774,0.774,2.028,0.774,2.802,0L42.42,12.401z"/><linearGradient id="${gradientIdB}" x1="27.373" x2="40.507" y1="27.373" y2="40.507" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a8142e"/><stop offset=".179" stop-color="#ba1632"/><stop offset=".243" stop-color="#c21734"/></linearGradient><path fill="url(#${gradientIdB})" d="M24,30.821L35.599,42.42c0.774,0.774,2.028,0.774,2.802,0l4.019-4.019 c0.774-0.774,0.774-2.028,0-2.802L30.821,24L24,30.821z"/></svg>
`;
}

const url = document.getElementById("aria2c-url") as HTMLInputElement;
const saveDir = document.getElementById("aria2c-save-dir") as HTMLInputElement;
const downloadBtn = document.getElementById("aria2c-download-btn") as HTMLButtonElement;
const openDivBtn = document.getElementById("aria2c-open-dir-btn") as HTMLButtonElement;
const progressWrapper = document.getElementById("aria2c-progress-wrapper") as HTMLDivElement;

type ProgressItem = {
  wrapper: HTMLDivElement;
  bar: HTMLDivElement;
  percent: HTMLSpanElement;
  state: HTMLSpanElement;
  cancelBtn: HTMLButtonElement;
};

const progressItems = new Map<string, ProgressItem>();
let bound = false;

function formatSpeed(bytesPerSec: number): string {
  const mb = bytesPerSec / 1024 / 1024;
  if (mb < 1) return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
  return `${mb.toFixed(2)} MB/s`;
}

function truncate(str: string, max = 30): string {
  if (!str) return "";
  if (str.length <= max) return str;
  const head = str.slice(0, Math.floor(max * 0.6));
  const tail = str.slice(-Math.floor(max * 0.4));
  return `${head}...${tail}`;
}

function createProgressItem(uuid: string): void {
  const wrapper = document.createElement("div");
  const header = document.createElement("div");
  const state = document.createElement("span");
  const percent = document.createElement("span");
  const progressRow = document.createElement("div");
  const track = document.createElement("div");
  const bar = document.createElement("div");
  const cancelBtn = document.createElement("button");

  wrapper.id = uuid;
  wrapper.dataset.gid = "";
  header.style.cssText = "display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);";
  state.innerText = "下载中...";
  percent.innerText = "0%";

  progressRow.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";
  track.style.cssText = "flex:1;width:100%;height:6px;background:var(--border);border-radius:3px;overflow:hidden;";
  bar.style.cssText = "width:0%;height:100%;background:var(--primary);border-radius:3px;transition:width 0.2s ease;";

  cancelBtn.type = "button";
  cancelBtn.disabled = true;
  cancelBtn.title = "移除任务";
  cancelBtn.style.cssText = "width:20px;height:20px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;padding:0;cursor:pointer;flex-shrink:0;opacity:.85;";
  cancelBtn.innerHTML = cancelIconSvg(uuid);
  const cancelIcon = cancelBtn.querySelector("svg");
  if (cancelIcon) cancelIcon.style.cssText = "width:18px;height:18px;display:block;";

  cancelBtn.addEventListener("click", () => void removeTask(wrapper, cancelBtn, state));

  header.appendChild(state);
  header.appendChild(percent);
  track.appendChild(bar);
  progressRow.appendChild(track);
  progressRow.appendChild(cancelBtn);
  wrapper.appendChild(header);
  wrapper.appendChild(progressRow);
  progressWrapper.appendChild(wrapper);

  progressItems.set(uuid, { wrapper, bar, percent, state, cancelBtn });
}

async function removeTask(
  wrapper: HTMLDivElement,
  button: HTMLButtonElement,
  state: HTMLSpanElement,
): Promise<void> {
  const gid = wrapper.dataset.gid;
  if (!gid) {
    showStatus("任务还没有拿到 gid，请稍后再试。", true, 4000);
    return;
  }

  button.disabled = true;

  try {
    await invoke("aria2c_rpc_remove", { gid });
    wrapper.dataset.removed = "true";
    state.innerText = "任务已移除";
    showStatus("任务已移除", false, 4000);
  } catch (e) {
    button.disabled = false;
    showStatus(`移除任务失败: ${String(e)}`, true, 5000);
  }
}

void listen<Aria2cRpcProgress>("aria2c-rpc-progress", (event) => {
  const res = event.payload;
  const item = progressItems.get(res.uuid);
  if (!item || item.wrapper.dataset.removed === "true") return;

  item.wrapper.dataset.gid = res.gid;
  item.cancelBtn.disabled = false;

  const percent = Math.min(100, Math.max(0, res.progress * 100));
  item.bar.style.width = `${percent}%`;
  item.percent.innerText = `${percent.toFixed(2)}% ${formatSpeed(Number(res.speed))}`;
});

void listen<Aria2cRpcEnd>("aria2c-rpc-end", (event) => {
  const res = event.payload;
  const item = progressItems.get(res.uuid);
  const wasRemoved = item?.wrapper.dataset.removed === "true";

  if (item) {
    item.state.innerText = res.ok
      ? `下载完成: ${truncate(res.filename, 25)}`
      : wasRemoved
        ? "任务已移除"
        : "下载失败";
    item.cancelBtn.disabled = true;
  }

  showStatus(
    res.ok
      ? `下载完成: ${truncate(res.filename, 25)}，路径: ${truncate(res.path, 40)}`
      : wasRemoved
        ? "任务已移除"
        : "下载失败",
    !res.ok && !wasRemoved,
    5000
  );
});

export function initSettingsDownloader(): void {
  saveDir.value = `${userDir}downloads`;

  if (bound) return;
  bound = true;

  downloadBtn.addEventListener("click", () => {
    const downloadUrl = url.value.trim();
    if (!downloadUrl) {
      showStatus("请输入下载链接。", true);
      return;
    }

    const uuid = crypto.randomUUID();
    createProgressItem(uuid);
    void invoke("aria2c_rpc_download", { url: downloadUrl, dir: saveDir.value, uuid });
  });

  openDivBtn.addEventListener("click", () => {
    void invoke("open_dir", { dir: saveDir.value });
  });
}
