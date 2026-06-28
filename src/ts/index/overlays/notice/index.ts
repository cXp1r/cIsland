import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export { clearQueue, enqueueNotice, initNoticeQueue, showNotice } from "./queue";
export { dismissOverlays, initNoticeUrl, restoreUserView } from "./url";

export const noticeOverlayModule: OverlayRequest = {
  id: "notice",
  priority: OverlayPriority.Notice,
};
