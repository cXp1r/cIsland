import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export const noticeOverlayModule: OverlayRequest = {
  id: "notice",
  priority: OverlayPriority.Notice,
};

