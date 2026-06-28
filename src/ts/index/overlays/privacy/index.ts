import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export const privacyOverlayModule: OverlayRequest = {
  id: "privacy",
  priority: OverlayPriority.Privacy,
};

