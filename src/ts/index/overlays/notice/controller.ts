import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { setPendingUrls, isPageState, setUserChosenView, userChosenView } from "../../utils/state";
import { OverlayPriority } from "../priority";
import { stopOverlayPointerEvents } from "../events";
import { overlayManager } from "../manager";
import { logi } from "../../shared/logger";
import type { ClipboardUrlsPayload } from "../../utils/types";
import { url } from "../../pages/downloader";
import { PageState } from "../../pages/types";
import { pageStateMachine } from "../../pages/machine";
import { DownloaderPageSubstate } from "../../pages/downloader/machine";
import { capsule, noticeArea } from "./dom";
import type { ClipboardPayload, NoticeItem } from "./model";
import {
  clearNoticeView,
  renderMessage,
  renderUrlList,
  showNoticeView,
} from "./renderer";


const TAG: string = "NoticeQueue";

const MAX_DURATION = 30000;
const NOTICE_PRIORITY = OverlayPriority.Notice;

// ===== 内部状�?=====

const queue: NoticeItem[] = [];
let activeItem: NoticeItem | null = null;
let displayTimer: number | null = null;
let noticeIdCounter = 0;
let urlListMode = false;

// ===== 工具函数 =====

function createNoticeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function describeNotice(item: NoticeItem): string {
  return `id=${item.id} uuid=${item.uuid || "none"} type=${item.type} msg="${item.message}"`;
}

function describeNotice_safe(item: NoticeItem | null): string {
  return item ? describeNotice(item) : "none";
}

function handleUrlClick(clickedUrl: string): void {
  logi(TAG, `url-click: url=${clickedUrl}`);
  void invoke("open_link_with_handler", { url: clickedUrl });
  void invoke("set_interacting", { active: false });
  exitUrlListMode();
}

function handleDownloadClick(item: NoticeItem): void {
  if (activeItem?.id !== item.id) return;
  const p = item.payload as ClipboardPayload;
  logi(TAG, `download-click: ${describeNotice(item)} urls=${p.urls}`);
  url.value = p.urls[0];
  pageStateMachine.transitionTo(PageState.Downloader);
  pageStateMachine.substates[PageState.Downloader].transitionTo(DownloaderPageSubstate.Expanded);
  void invoke("set_expanded", { expanded: true });
  console.log("[NoticeQueue] download clicked, urls:", p.urls);
  completeActiveNotice(true, "download");
}

function handleRenderedMainClick(item: NoticeItem): void {
  if (activeItem?.id !== item.id) {
    logi(TAG, `main-click-ignored: clicked=${item.id} active=${activeItem?.id || "none"}`);
    return;
  }
  logi(TAG, `main-click: ${describeNotice(item)}`);
  handleMainClick(item);
}

function handleDismissClick(item: NoticeItem): void {
  if (activeItem?.id !== item.id) {
    logi(TAG, `dismiss-ignored: clicked=${item.id} active=${activeItem?.id || "none"}`);
    return;
  }
  logi(TAG, `dismiss: ${describeNotice(item)} queued=${queue.length}`);
  completeActiveNotice(true, "dismiss");
}

// ===== 各类型的 .notice-main 点击行为 =====

function handleMainClick(item: NoticeItem): void {
  switch (item.type) {
    case "clipboard":
      handleClipboardNotice(item);
      break;
    case "email":
      handleEmailNotice(item);
      break;
    default:
      completeActiveNotice(false, "generic-main-click");
      break;
  }
}

function handleClipboardNotice(item: NoticeItem): void {
  const p = item.payload as ClipboardPayload;
  logi(TAG, `clipboard-action: ${describeNotice(item)} urlCount=${p.urls.length} downloadable=${p.downloadable}`);
  clearTimer();
  if (p.urls.length === 1) {
    logi(TAG, `clipboard-open-single: id=${item.id} url=${p.urls[0]}`);
    void invoke("open_link_with_handler", { url: p.urls[0] });
    completeActiveNotice(false, "clipboard-open-single");
  } else {
    logi(TAG, `clipboard-open-list: id=${item.id} count=${p.urls.length}`);
    urlListMode = true;
    void invoke("set_interacting", { active: true });
    renderUrlList(p.urls, handleUrlClick);
  }
}

function handleEmailNotice(item: NoticeItem): void {
  const payload = item.payload as { uid?: string | number } | null;
  openEmailWindow(payload?.uid);
  completeActiveNotice(true, "email-open");
}

function openEmailWindow(uid?: string | number): Promise<void> {
  const normalizedUid = uid != null ? String(uid) : undefined;
  if (normalizedUid) {
    return invoke("open_email_window", { uid: normalizedUid });
  }
  return invoke("open_email_window");
}

// ===== 点击 notice-area 空白处（URL 列表模式退出）=====

function handleAreaClick(): void {
  if (urlListMode) {
    logi(TAG, `notice-area-click: exit-url-list active=${describeNotice_safe(activeItem)}`);
    exitUrlListMode();
    return;
  }
  if (!activeItem) {
    logi(TAG, `notice-area-click: no active notice`);
    return;
  }
  logi(TAG, `notice-area-click: ignored active=${describeNotice(activeItem)}`);
}

// ===== 队列推进 =====

function showNext(): void {
  clearTimer();

  if (urlListMode) {
    logi(TAG, `showNext-deferred: urlListMode=true queued=${queue.length} active=${activeItem?.id || "none"}`);
    return;
  }

  if (queue.length === 0) {
    logi(TAG, `showNext-empty: active=${activeItem?.id || "none"}`);
    activeItem = null;
    finishAll();
    return;
  }

  // 有更高优先级弹层活跃时不抢占，等它结束再推进
  if (!overlayManager.canEnter(NOTICE_PRIORITY)) {
    logi(TAG, `showNext-blocked: overlayPriority=${overlayManager.priority} > NOTICE_PRIORITY=${NOTICE_PRIORITY} queued=${queue.length + 1}`);
    return;
  }

  activeItem = queue.shift()!;
  logi(TAG, `showNext: ${describeNotice(activeItem)} remaining=${queue.length}`);
  overlayManager.request("notice", OverlayPriority.Notice);
  renderMessage(activeItem, {
    onMainClick: handleRenderedMainClick,
    onDismiss: handleDismissClick,
    onDownload: handleDownloadClick,
  });
  capsule.classList.add("notice-active");
  showNoticeView();

  displayTimer = window.setTimeout(() => {
    const expired = activeItem;
    if (expired) {
      logi(TAG, `timeout: ${describeNotice(expired)} queued=${queue.length}`);
    } else {
      logi(TAG, `timeout: active=none queued=${queue.length}`);
    }
    activeItem = null;
    displayTimer = null;
    showNext();
  }, activeItem.duration);
}

// ===== 状态管�?=====

function completeActiveNotice(shouldClearTimer = true, reason = "complete"): void {
  logi(TAG, `complete: reason=${reason} active=${describeNotice_safe(activeItem)} queued=${queue.length} clearTimer=${shouldClearTimer}`);
  if (shouldClearTimer) clearTimer();
  activeItem = null;
  urlListMode = false;
  void invoke("set_interacting", { active: false });
  advanceOrFinish();
}

function advanceOrFinish(): void {
  if (queue.length > 0) {
    logi(TAG, `advance: queued=${queue.length}`);
    showNext();
  } else {
    logi(TAG, `advance: queue empty, finish`);
    finishAll();
  }
}

function exitUrlListMode(): void {
  logi(TAG, `exitUrlListMode: active=${describeNotice_safe(activeItem)} queued=${queue.length}`);
  urlListMode = false;
  activeItem = null;
  void invoke("set_interacting", { active: false });
  advanceOrFinish();
}

function clearTimer(): void {
  if (displayTimer !== null) {
    clearTimeout(displayTimer);
    displayTimer = null;
  }
}

function finishAll(): void {
  logi(TAG, `finishAll: queue empty, collapsing`);
  capsule.classList.remove("expanded");
  capsule.classList.remove("notice-active");
  clearNoticeView();
  void invoke("dismiss_island");
  overlayManager.release("notice");
}

// ===== 公开 API =====

export function enqueueNotice(item: NoticeItem): void {
  item.duration = Math.min(item.duration, MAX_DURATION);
  item.uuid = item.uuid || createNoticeUuid();
  logi(TAG, `enqueue: ${describeNotice(item)} duration=${item.duration}ms queueBefore=${queue.length} active=${activeItem?.id || "none"} urlListMode=${urlListMode}`);
  queue.push(item);
  logi(TAG, `queued: id=${item.id} queueAfter=${queue.length}`);
  if (!activeItem && !urlListMode) {
    logi(TAG, `enqueue-trigger-show: id=${item.id}`);
    showNext();
  }
}

export function showNotice(msg: string): void {
  enqueueNotice({
    id: `generic-${++noticeIdCounter}`,
    type: "generic",
    message: msg,
    duration: MAX_DURATION,
    payload: null,
    timestamp: Date.now(),
  });
}

export function clearQueue(): void {
  logi(TAG, `clearQueue: active=${describeNotice_safe(activeItem)} queued=${queue.length} urlListMode=${urlListMode}`);
  queue.length = 0;
  activeItem = null;
  urlListMode = false;
  clearTimer();
  finishAll();
}

export function dismissOverlays(): void {
  clearNoticeView();
}

export function restoreUserView(): void {
  dismissOverlays();

  if (isPageState(userChosenView) && pageStateMachine.order.includes(userChosenView)) {
    pageStateMachine.transitionTo(userChosenView);
  } else {
    setUserChosenView(PageState.Time);
    pageStateMachine.transitionTo(PageState.Time);
  }
}

// ===== 初始�?=====

export function initNoticeQueue(): void {
  stopOverlayPointerEvents(noticeArea);

  // 更高优先级弹层抢占时，通知自动让位；更高优先级结束后恢�?
  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    const newPriority = e.detail.priority as number;
    // 更高优先级抢�?�?通知让位
    if (activeItem && newPriority > NOTICE_PRIORITY) {
      logi(TAG, `overlay-changed-yield: newPriority=${newPriority} > NOTICE_PRIORITY active=${describeNotice(activeItem)} queued=${queue.length}`);
      clearTimer();
      // 把当�?item 放回队首
      queue.unshift(activeItem);
      activeItem = null;
      urlListMode = false;
      void invoke("set_interacting", { active: false });
      capsule.classList.remove("notice-active");
      clearNoticeView();
      return;
    }
    // 更高优先级消�?�?如果有排队通知则恢�?
    if (newPriority < NOTICE_PRIORITY && queue.length > 0 && !activeItem && !urlListMode) {
      logi(TAG, `overlay-changed-resume: newPriority=${newPriority} queued=${queue.length}`);
      showNext();
    }
  }) as EventListener);

  // 点击 notice-area 空白�?
  noticeArea.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    handleAreaClick();
  });

  // 剪贴板链�?
  listen<ClipboardUrlsPayload>("clipboard-urls", (event) => {
    const c = event.payload;
    if (!c.urls || c.urls.length === 0) return;
    setPendingUrls(c.urls);
    const shortcut = "Alt+O";
    const msg = c.urls.length === 1
      ? `已复制链接，�?${shortcut} 或点击打开`
      : `检测到 ${c.urls.length} 个链接，点击查看`;


    logi(TAG, `clipboard-urls: urls=${c.urls.length} downloadable=${c.downloadables}`);

    enqueueNotice({
      id: `clip-${++noticeIdCounter}`,
      type: "clipboard",
      message: msg,
      duration: MAX_DURATION,
      payload: c,
      timestamp: Date.now(),
    });
  });

  // 邮件通知
  listen<{ uid: string; message: string }>("email-notice", (event) => {
    enqueueNotice({
      id: `email-${++noticeIdCounter}`,
      type: "email",
      message: event.payload.message,
      duration: MAX_DURATION,
      payload: event.payload,
      timestamp: Date.now(),
    });
  });

  // 后端通用 show-notice（兜底）
  listen<string>("show-notice", (event) => {
    logi(TAG, `show-notice event received: "${event.payload}"`);
    enqueueNotice({
      id: `generic-${++noticeIdCounter}`,
      type: "generic",
      message: event.payload,
      duration: MAX_DURATION,
      payload: null,
      timestamp: Date.now(),
    });
  });
}

export function initNoticeUrl(): void {
  listen("reset-view", () => {
    restoreUserView();
  });
}
