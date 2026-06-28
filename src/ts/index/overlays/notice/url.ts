import { listen } from "@tauri-apps/api/event";
import { pageStateMachine } from "../../pages/machine";
import { PageState } from "../../pages/types";
import { noticeArea } from "../../shell/dom";
import { isPageState, setUserChosenView, userChosenView } from "../../utils/state";

export { showNotice } from "./queue";

export function dismissOverlays(): void {
  noticeArea.classList.remove("active", "notice-urllist");
  noticeArea.innerHTML = "";
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

export function initNoticeUrl(): void {
  listen("reset-view", () => {
    restoreUserView();
  });
}
