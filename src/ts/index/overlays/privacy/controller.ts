import { listen } from "@tauri-apps/api/event";
import {
  lastPrivacyUsage,
  privacyPopupTimer,
  setLastPrivacyUsage,
  setPrivacyPopupTimer,
} from "../../utils/state";
import type { PrivacyUsagePayload } from "../../utils/types";
import { overlayManager } from "../manager";
import { OverlayPriority } from "../priority";
import {
  clearPrivacyPopup,
  isAgentExpanded,
  isPrivacyPopupVisible,
  renderPrivacyPopup,
} from "./renderer";

const PRIVACY_PRIORITY = OverlayPriority.Privacy;

export function hidePrivacyPopup(): void {
  if (privacyPopupTimer) {
    clearTimeout(privacyPopupTimer);
    setPrivacyPopupTimer(null);
  }

  clearPrivacyPopup();

  if (overlayManager.state === "privacy") {
    overlayManager.release("privacy");
  }
}

function showPrivacyPopup(payload: PrivacyUsagePayload): void {
  const { microphone, camera } = payload;
  if (!microphone && !camera) return;
  if (isAgentExpanded()) return;
  if (!overlayManager.canEnter(PRIVACY_PRIORITY)) return;

  overlayManager.request("privacy", PRIVACY_PRIORITY);
  renderPrivacyPopup(payload);

  if (privacyPopupTimer) {
    clearTimeout(privacyPopupTimer);
  }
  setPrivacyPopupTimer(window.setTimeout(() => {
    hidePrivacyPopup();
  }, 3000));
}

export function initPrivacy(): void {
  listen<PrivacyUsagePayload>("privacy-usage", (event) => {
    const next = event.payload;
    const micStarted = next.microphone && !lastPrivacyUsage.microphone;
    const camStarted = next.camera && !lastPrivacyUsage.camera;

    if (micStarted || camStarted) {
      showPrivacyPopup(next);
    } else if (
      !next.microphone
      && !next.camera
      && (lastPrivacyUsage.microphone || lastPrivacyUsage.camera)
    ) {
      hidePrivacyPopup();
    }

    setLastPrivacyUsage(next);
  });

  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    const newPriority = e.detail.priority as number;
    if (isPrivacyPopupVisible() && newPriority > PRIVACY_PRIORITY) {
      hidePrivacyPopup();
    }
  }) as EventListener);
}
