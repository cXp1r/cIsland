import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UpdateInfo } from "./types";

const currentVersionEl = document.getElementById("current-version") as HTMLSpanElement;
const updateStatusText = document.getElementById("update-status-text") as HTMLParagraphElement;
const updateInfoCard = document.getElementById("update-info-card") as HTMLDivElement;
const updateLatestVersion = document.getElementById("update-latest-version") as HTMLSpanElement;
const updatePublished = document.getElementById("update-published") as HTMLParagraphElement;
const updateNotes = document.getElementById("update-notes") as HTMLDivElement;
const updateCardTitle = document.getElementById("update-card-title") as HTMLSpanElement;
const updateProgressWrapper = document.getElementById("update-progress-wrapper") as HTMLDivElement;
const updateProgressText = document.getElementById("update-progress-text") as HTMLSpanElement;
const updateProgressPercent = document.getElementById("update-progress-percent") as HTMLSpanElement;
const updateProgressBar = document.getElementById("update-progress-bar") as HTMLDivElement;
const checkStableUpdateBtn = document.getElementById("check-stable-update-btn") as HTMLButtonElement;
const checkPreviewUpdateBtn = document.getElementById("check-preview-update-btn") as HTMLButtonElement;
const downloadUpdateBtn = document.getElementById("download-update-btn") as HTMLButtonElement;
const openReleaseBtn = document.getElementById("open-release-btn") as HTMLButtonElement;
const openGithubBtn = document.getElementById("open-github-btn") as HTMLButtonElement;
const previewUpdatesToggle = document.getElementById("preview-updates-toggle") as HTMLInputElement | null;
const previewToggleRow = document.getElementById("preview-toggle-row") as HTMLElement | null;
const disablePreviewWrap = document.getElementById("disable-preview-wrap") as HTMLElement | null;
const disablePreviewBtn = document.getElementById("disable-preview-btn") as HTMLButtonElement | null;

const logPathText = document.getElementById("log-path-text") as HTMLParagraphElement;
const openLogDirBtn = document.getElementById("open-log-dir-btn") as HTMLButtonElement;

const stableReleaseUrl = "https://github.com/Python-island/Python-island/releases/latest";
const previewReleaseUrl = "https://github.com/cXp1r/tauri-island/releases/latest";
let pendingDownloadUrl = "";
let activeReleaseUrl = stableReleaseUrl;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function applyPreviewVisibility(enabled: boolean) {
  if (previewToggleRow) previewToggleRow.style.display = enabled ? "" : "none";
  if (disablePreviewWrap) disablePreviewWrap.style.display = enabled ? "" : "none";
}

async function checkUpdate(isPreview: boolean, button: HTMLButtonElement) {
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
      if (updateCardTitle) updateCardTitle.textContent = isPreview ? "🚧 发现预览构建" : "🎉 发现新版本";
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

export function initUpdate(): void {
  // 加载预览更新开关
  invoke<boolean>("get_preview_updates").then((enabled) => {
    if (previewUpdatesToggle) previewUpdatesToggle.checked = enabled;
  }).catch(() => {});

  if (previewUpdatesToggle) {
    previewUpdatesToggle.addEventListener("change", () => {
      void invoke("set_preview_updates", { enabled: previewUpdatesToggle.checked });
    });
  }

  invoke<boolean>("get_show_preview_toggle").then(applyPreviewVisibility).catch(() => {});

  if (disablePreviewBtn) {
    disablePreviewBtn.addEventListener("click", () => {
      void invoke("set_show_preview_toggle", { enabled: false });
      applyPreviewVisibility(false);
    });
  }

  invoke<string>("get_app_version").then((ver) => {
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

    try {
      await invoke("download_and_install_update", { url: pendingDownloadUrl });
    } catch (e) {
      updateProgressText.textContent = `下载失败: ${e}`;
      updateProgressText.style.color = "var(--danger)";
      downloadUpdateBtn.disabled = false;
      downloadUpdateBtn.textContent = "重试下载";
    }
  });

  listen<{ downloaded: number; total: number; percent: number }>("update-download-progress", (event) => {
    const { downloaded, total, percent } = event.payload;
    updateProgressBar.style.width = `${percent.toFixed(1)}%`;
    updateProgressPercent.textContent = `${percent.toFixed(1)}%`;
    updateProgressText.textContent = `${formatFileSize(downloaded)} / ${formatFileSize(total)}`;
  });

  listen("update-download-complete", () => {
    updateProgressText.textContent = "下载完成，正在启动安装程序...";
    updateProgressBar.style.width = "100%";
    updateProgressPercent.textContent = "100%";
  });

  listen<string>("update-error", (event) => {
    updateProgressText.textContent = `错误: ${event.payload}`;
    updateProgressText.style.color = "var(--danger)";
    downloadUpdateBtn.disabled = false;
    downloadUpdateBtn.textContent = "重试下载";
  });

  openReleaseBtn.addEventListener("click", () => {
    invoke("open_url", { url: activeReleaseUrl });
  });

  openGithubBtn.addEventListener("click", () => {
    invoke("open_url", { url: "https://github.com/Python-island/Python-island/tree/tauri-island" });
  });

  invoke<string>("get_log_path").then((p) => {
    if (logPathText) logPathText.textContent = p;
  }).catch(() => {
    if (logPathText) logPathText.textContent = "获取失败";
  });

  if (openLogDirBtn) {
    openLogDirBtn.addEventListener("click", () => {
      void invoke("open_log_dir");
    });
  }
}
