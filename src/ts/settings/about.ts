import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { configDir } from "./main";
import { $ } from "./shared";
import type { UpdateInfo } from "./types";

const openCfgBtn = $<HTMLButtonElement>("open-cfg-btn");
const currentVersionEl = $<HTMLSpanElement>("current-version");
const updateStatusText = $<HTMLParagraphElement>("update-status-text");
const updateInfoCard = $<HTMLDivElement>("update-info-card");
const updateLatestVersion = $<HTMLSpanElement>("update-latest-version");
const updatePublished = $<HTMLParagraphElement>("update-published");
const updateNotes = $<HTMLDivElement>("update-notes");
const updateCardTitle = $<HTMLSpanElement>("update-card-title");
const updateProgressWrapper = $<HTMLDivElement>("update-progress-wrapper");
const updateProgressText = $<HTMLSpanElement>("update-progress-text");
const updateProgressPercent = $<HTMLSpanElement>("update-progress-percent");
const updateProgressBar = $<HTMLDivElement>("update-progress-bar");
const checkStableUpdateBtn = $<HTMLButtonElement>("check-stable-update-btn");
const checkPreviewUpdateBtn = $<HTMLButtonElement>("check-preview-update-btn");
const downloadUpdateBtn = $<HTMLButtonElement>("download-update-btn");
const openReleaseBtn = $<HTMLButtonElement>("open-release-btn");
const openGithubBtn = $<HTMLButtonElement>("open-github-btn");
const previewUpdatesToggle = $<HTMLInputElement>("preview-updates-toggle");
const previewToggleRow = $<HTMLElement>("preview-toggle-row");
const disablePreviewWrap = $<HTMLElement>("disable-preview-wrap");
const disablePreviewBtn = $<HTMLButtonElement>("disable-preview-btn");
const logPathText = $<HTMLParagraphElement>("log-path-text");
const openLogDirBtn = $<HTMLButtonElement>("open-log-dir-btn");

const stableReleaseUrl = "https://github.com/Python-island/Python-island/releases/latest";
const previewReleaseUrl = "https://github.com/cXp1r/tauri-island/releases/latest";

let pendingDownloadUrl = "";
let activeReleaseUrl = stableReleaseUrl;
let bound = false;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function applyPreviewVisibility(enabled: boolean): void {
  previewToggleRow.style.display = enabled ? "" : "none";
  disablePreviewWrap.style.display = enabled ? "" : "none";
}

async function checkUpdate(isPreview: boolean, button: HTMLButtonElement): Promise<void> {
  const defaultText = isPreview ? "预览版检查更新" : "稳定版检查更新";
  activeReleaseUrl = isPreview ? previewReleaseUrl : stableReleaseUrl;
  button.disabled = true;
  button.textContent = "检查中...";
  updateStatusText.style.color = "var(--text-secondary)";
  updateStatusText.textContent = isPreview ? "正在检查预览版更新..." : "正在检查稳定版更新...";
  updateInfoCard.style.display = "none";
  downloadUpdateBtn.style.display = "none";
  openReleaseBtn.style.display = "none";

  let failed = false;
  try {
    const info = await invoke<UpdateInfo>("check_for_updates", { preview: isPreview });
    currentVersionEl.textContent = `v${info.current_version}`;

    if (info.has_update) {
      updateStatusText.textContent = isPreview ? "发现预览构建！" : "发现新版本！";
      updateStatusText.style.color = "var(--primary)";
      updateCardTitle.textContent = isPreview ? "发现预览构建" : "发现新版本";
      updateLatestVersion.textContent = isPreview ? `预览: ${info.latest_version}` : `v${info.latest_version}`;
      updatePublished.textContent = info.published_at
        ? `发布于 ${new Date(info.published_at).toLocaleDateString("zh-CN")}`
        : "";
      updateNotes.textContent = info.release_notes || "暂无更新说明";
      updateInfoCard.style.display = "block";
      downloadUpdateBtn.style.display = "inline-flex";
      openReleaseBtn.style.display = "inline-flex";
      pendingDownloadUrl = info.download_url;
    } else {
      updateStatusText.textContent = isPreview
        ? `当前是最新预览版 (v${info.current_version})`
        : `当前是最新稳定版 (v${info.current_version})`;
      updateStatusText.style.color = "var(--ok)";
    }
  } catch (e) {
    failed = true;
    updateStatusText.textContent = `检查更新失败: ${e}`;
    updateStatusText.style.color = "var(--danger)";
  } finally {
    if (failed) {
      let cd = 10;
      button.textContent = `重试 (${cd}s)`;
      const cdTimer = setInterval(() => {
        cd--;
        if (cd <= 0) {
          clearInterval(cdTimer);
          button.disabled = false;
          button.textContent = defaultText;
        } else {
          button.textContent = `重试 (${cd}s)`;
        }
      }, 1000);
    } else {
      button.disabled = false;
      button.textContent = defaultText;
    }
  }
}

export function initSettingsAbout(): void {
  if (bound) return;

  openCfgBtn.addEventListener("click", () => {
    void invoke("open_path", { path: `${configDir}settings.json` });
  });

  void invoke<boolean>("get_show_preview_toggle").then(applyPreviewVisibility).catch(() => {});


  void invoke<string>("get_app_version").then((ver) => {
    currentVersionEl.textContent = `v${ver}`;
  }).catch(() => {
    currentVersionEl.textContent = "未知";
  });

  checkStableUpdateBtn.addEventListener("click", () => {
    void checkUpdate(false, checkStableUpdateBtn);
  });

  checkPreviewUpdateBtn.addEventListener("click", () => {
    void checkUpdate(true, checkPreviewUpdateBtn);
  });

  downloadUpdateBtn.addEventListener("click", async () => {
    if (!pendingDownloadUrl) return;
    downloadUpdateBtn.disabled = true;
    downloadUpdateBtn.textContent = "下载中...";
    updateProgressWrapper.style.display = "block";
    updateProgressBar.style.width = "0%";
    updateProgressPercent.textContent = "0%";
    updateProgressText.textContent = "下载中...";
    updateProgressText.style.color = "";

    try {
      await invoke("download_and_install_update", { url: pendingDownloadUrl });
    } catch (e) {
      updateProgressText.textContent = `下载失败: ${e}`;
      updateProgressText.style.color = "var(--danger)";
      downloadUpdateBtn.disabled = false;
      downloadUpdateBtn.textContent = "重试下载";
    }
  });

  void listen<{ downloaded: number; total: number; percent: number }>("update-download-progress", (event) => {
    const { downloaded, total, percent } = event.payload;
    updateProgressBar.style.width = `${percent.toFixed(1)}%`;
    updateProgressPercent.textContent = `${percent.toFixed(1)}%`;
    updateProgressText.textContent = `${formatFileSize(downloaded)} / ${formatFileSize(total)}`;
  });

  void listen("update-download-complete", () => {
    updateProgressText.textContent = "下载完成，正在启动安装程序...";
    updateProgressBar.style.width = "100%";
    updateProgressPercent.textContent = "100%";
  });

  void listen<string>("update-error", (event) => {
    updateProgressText.textContent = `错误: ${event.payload}`;
    updateProgressText.style.color = "var(--danger)";
    downloadUpdateBtn.disabled = false;
    downloadUpdateBtn.textContent = "重试下载";
  });

  openReleaseBtn.addEventListener("click", () => {
    void invoke("open_url", { url: activeReleaseUrl });
  });

  openGithubBtn.addEventListener("click", () => {
    void invoke("open_url", { url: "https://github.com/Python-island/Python-island/tree/tauri-island" });
  });

  void invoke<string>("get_log_path").then((p) => {
    logPathText.textContent = p;
  }).catch(() => {
    logPathText.textContent = "获取失败";
  });

  openLogDirBtn.addEventListener("click", () => {
    void invoke("open_log_dir");
  });

  bound = true;
}
