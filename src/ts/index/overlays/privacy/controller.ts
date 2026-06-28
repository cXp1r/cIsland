import { listen } from "@tauri-apps/api/event";
import { capsule, privacyCamera, privacyIndicators, privacyMic } from "../../shell/dom";
import {
  lastPrivacyUsage,
  privacyPopupTimer,
  setLastPrivacyUsage,
  setPrivacyPopupTimer,
} from "../../utils/state";
import type { PrivacyUsagePayload } from "../../utils/types";
import { overlayManager } from "../manager";
import { OverlayPriority } from "../priority";

const PRIVACY_PRIORITY = OverlayPriority.Privacy;

export function hidePrivacyPopup(): void {
  if (privacyPopupTimer) {
    clearTimeout(privacyPopupTimer);
    setPrivacyPopupTimer(null);
  }

  capsule.classList.remove("privacy-active");
  privacyIndicators.classList.remove("active");
  privacyMic.classList.remove("active");
  privacyCamera.classList.remove("active");

  if (overlayManager.state === "privacy") {
    overlayManager.release("privacy");
  }
}

function showPrivacyPopup(payload: PrivacyUsagePayload): void {
  const { microphone, camera } = payload;
  if (!microphone && !camera) return;
  if (capsule.classList.contains("agent-expanded")) return;
  if (!overlayManager.canEnter(PRIVACY_PRIORITY)) return;

  overlayManager.request("privacy", PRIVACY_PRIORITY);

  privacyMic.classList.toggle("active", microphone);
  privacyCamera.classList.toggle("active", camera);

  capsule.classList.add("privacy-active");
  privacyIndicators.classList.add("active");

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
    if (capsule.classList.contains("privacy-active") && newPriority > PRIVACY_PRIORITY) {
      hidePrivacyPopup();
    }
  }) as EventListener);
}
