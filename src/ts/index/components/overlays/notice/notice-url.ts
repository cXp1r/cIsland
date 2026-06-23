import { listen } from "@tauri-apps/api/event";
import { noticeArea } from "../dom";
import { userChosenView, setUserChosenView } from "../state";
import { getAvailableViews, setView } from "./view-switcher";

// 从 notice-queue 重新导出，保持其他模块 import 路径不变
export { showNotice } from "./notice-queue";

export function dismissOverlays() {
  noticeArea.classList.remove("active", "notice-urllist");
  noticeArea.innerHTML = "";
}

export function restoreUserView() {
  dismissOverlays();

  const views = getAvailableViews();
  if (views.includes(userChosenView)) {
    setView(userChosenView, true);
  } else {
    setUserChosenView("time");
    setView("time", true);
  }
}

export function initNoticeUrl() {
  // reset-view
  listen("reset-view", () => { restoreUserView(); });
}
