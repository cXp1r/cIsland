import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export {
  clearQueue,
  enqueueNotice,
  initNoticeQueue,
  initNoticeUrl,
  showNotice,
} from "./controller";
export type { ClipboardPayload, NoticeItem, NoticeType } from "./model";

export const noticeOverlayModule: OverlayRequest = {
  id: "notice",
  priority: OverlayPriority.Notice,
};
