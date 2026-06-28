import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export { hidePrivacyPopup, initPrivacy } from "./controller";

export const privacyOverlayModule: OverlayRequest = {
  id: "privacy",
  priority: OverlayPriority.Privacy,
};
