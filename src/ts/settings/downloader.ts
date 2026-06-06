import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { aria2cThread } from "./tools";
import { showStatus } from "./shared";
import { userDir } from "./main";
import type { Aria2cRpcEnd, Aria2cRpcProgress } from "./types";

const url = document.getElementById("aria2c-url") as HTMLInputElement;
const thread = document.getElementById("aria2c-downloader-thread") as HTMLInputElement;
const saveDir = document.getElementById("aria2c-save-dir") as HTMLInputElement;
const downloadBtn = document.getElementById("aria2c-download-btn") as HTMLButtonElement;
const openDivBtn = document.getElementById("aria2c-open-dir-btn") as HTMLButtonElement;
const progressWrapper = document.getElementById("aria2c-progress-wrapper") as HTMLDivElement;

type ProgressItem = {
  wrapper: HTMLDivElement;
  bar: HTMLDivElement;
  percent: HTMLSpanElement;
  state: HTMLSpanElement;
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
  const track = document.createElement("div");
  const bar = document.createElement("div");

  wrapper.id = uuid;
  header.style.cssText = "display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);";
  state.innerText = "下载中...";
  percent.innerText = "0%";
  track.style.cssText = "width:100%;height:6px;background:var(--border);border-radius:3px;overflow:hidden;";
  bar.style.cssText = "width:0%;height:100%;background:var(--primary);border-radius:3px;transition:width 0.2s ease;";

  header.appendChild(state);
  header.appendChild(percent);
  track.appendChild(bar);
  wrapper.appendChild(header);
  wrapper.appendChild(track);
  progressWrapper.appendChild(wrapper);

  progressItems.set(uuid, { wrapper, bar, percent, state });
}

void listen<Aria2cRpcProgress>("aria2c-rpc-progress", (event) => {
  const res = event.payload;
  const item = progressItems.get(res.uuid);
  if (!item) return;

  const percent = Math.min(100, Math.max(0, res.progress * 100));
  item.bar.style.width = `${percent}%`;
  item.percent.innerText = `${percent.toFixed(2)}% ${formatSpeed(res.speed)}`;
});

void listen<Aria2cRpcEnd>("aria2c-rpc-end", (event) => {
  const res = event.payload;
  const item = progressItems.get(res.uuid);

  if (item) {
    item.state.innerText = res.ok
      ? `下载完成: ${truncate(res.filename, 25)}`
      : "下载失败";
  }

  showStatus(
    res.ok
      ? `下载完成: ${truncate(res.filename, 25)}，路径: ${truncate(res.path, 40)}`
      : "下载失败",
    !res.ok,
    5000
  );
});

export function initSettingsDownloader(): void {
  thread.value = aria2cThread.value;
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
