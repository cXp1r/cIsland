import type { ClipboardUrlsPayload } from "../../utils/types";
import { truncateUrl } from "../../utils/utils";
import { noticeArea } from "./dom";
import type { ClipboardPayload, NoticeItem, NoticeType } from "./model";

interface NoticeRenderHandlers {
  onMainClick: (item: NoticeItem) => void;
  onDismiss: (item: NoticeItem) => void;
  onDownload: (item: NoticeItem) => void;
}

const ICON_INFO = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="18" height="18"><path d="M512 426.688a42.688 42.688 0 0 0-42.688 42.688v298.688a42.688 42.688 0 0 0 85.376 0V469.376A42.688 42.688 0 0 0 512 426.688zM507.776 213.376a59.776 59.776 0 1 0 0 119.552 59.776 59.776 0 0 0 0-119.552z" fill="#ffffff"/><path d="M512 0a512 512 0 1 0 0 1024 512 512 0 0 0 0-1024z m0 938.688a426.624 426.624 0 0 1-426.688-426.688c0-235.648 190.976-426.688 426.688-426.688s426.688 190.976 426.688 426.688-190.976 426.688-426.688 426.688z" fill="#ffffff"/></svg>`;
const ICON_EMAIL = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#fff" stroke-width="1.6"/><polyline points="22,6 12,13 2,6" stroke="#fff" stroke-width="1.6"/></svg>`;
const ICON_LINK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function iconForType(type: NoticeType): string {
  switch (type) {
    case "clipboard": return ICON_LINK;
    case "email": return ICON_EMAIL;
    default: return ICON_INFO;
  }
}

function baseNoticeHtml(item: NoticeItem): string {
  const uuid = item.uuid || item.id;
  const shortUuid = uuid.replace(/-/g, "").slice(0, 8);
  const p = item.payload as ClipboardUrlsPayload;
  const downloadBtn = (item.type === "clipboard" && p.urls.length === 1 && p.downloadables[0])
    ?  `<button class="notice-button" id="notice-download" type="button">下载</button>`
    : "";

  
  return `
  <div class="notice-content">
    <div class="notice-main">
    <div class="icon-box">${iconForType(item.type)}</div>
    <div class="notice-text">
      <div class="notice-msg">${escapeHtml(item.message)}</div>
      <div class="notice-uuid" title="${escapeHtml(uuid)}">
        #${escapeHtml(shortUuid)}</div>
      </div>
    </div>
    ${downloadBtn}
    <button class="notice-button" id="notice-dismiss" type="button">忽略</button>
  </div>`;
}

export function renderUrlList(urls: string[], onUrlClick: (url: string) => void): void {
  noticeArea.classList.add("notice-urllist");
  noticeArea.innerHTML = "";
  urls.forEach((url) => {
    const el = document.createElement("div");
    el.className = "url-item";
    el.textContent = truncateUrl(url, 50);
    el.title = url;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onUrlClick(url);
    });
    noticeArea.appendChild(el);
  });
}

export function renderMessage(item: NoticeItem, handlers: NoticeRenderHandlers): void {
  noticeArea.classList.remove("notice-urllist");
  noticeArea.innerHTML = baseNoticeHtml(item);

  const main = noticeArea.querySelector<HTMLElement>(".notice-main");
  const dismiss = noticeArea.querySelector<HTMLButtonElement>("#notice-dismiss");
  const download = noticeArea.querySelector<HTMLButtonElement>("#notice-download");

  download?.addEventListener("click", (e) => {
    e.stopPropagation();
    handlers.onDownload(item);
  });

  main?.addEventListener("click", (e) => {
    e.stopPropagation();
    handlers.onMainClick(item);
  });

  dismiss?.addEventListener("click", (e) => {
    e.stopPropagation();
    handlers.onDismiss(item);
  });
}

export function clearNoticeView(): void {
  noticeArea.classList.remove("active", "notice-urllist");
  noticeArea.innerHTML = "";
}

export function showNoticeView(): void {
  noticeArea.classList.add("active");
}

export type { ClipboardPayload, NoticeItem };
