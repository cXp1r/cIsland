import { listen } from "@tauri-apps/api/event";
import type { PrivacyUsagePayload } from "../types";
import { capsule, privacyIndicators, privacyMic, privacyCamera } from "../dom";
import {
  privacyPopupTimer, setPrivacyPopupTimer,
  lastPrivacyUsage, setLastPrivacyUsage,
  overlayPriority, setOverlayPriority,
} from "../state";

const PRIVACY_PRIORITY = 3;

export function hidePrivacyPopup() {
  if (privacyPopupTimer) {
    clearTimeout(privacyPopupTimer);
    setPrivacyPopupTimer(null);
  }

  capsule.classList.remove("privacy-active");
  privacyIndicators.classList.remove("active");
  privacyMic.classList.remove("active");
  privacyCamera.classList.remove("active");

  if (overlayPriority === PRIVACY_PRIORITY) {
    setOverlayPriority(-1);
  }
}

function showPrivacyPopup(payload: PrivacyUsagePayload) {
  const { microphone, camera } = payload;
  if (!microphone && !camera) return;

  // AI 大屏展开时不显示隐私检测
  if (capsule.classList.contains("agent-expanded")) return;

  // 优先级不够，不显示（当前有更高优先级弹层）
  if (overlayPriority > PRIVACY_PRIORITY) return;

  setOverlayPriority(PRIVACY_PRIORITY);

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

export function initPrivacy() {
  listen<PrivacyUsagePayload>("privacy-usage", (event) => {
    const next = event.payload;
    const micStarted = next.microphone && !lastPrivacyUsage.microphone;
    const camStarted = next.camera && !lastPrivacyUsage.camera;

    if (micStarted || camStarted) {
      showPrivacyPopup(next);
    } else if (!next.microphone && !next.camera && (lastPrivacyUsage.microphone || lastPrivacyUsage.camera)) {
      // 麦克风和摄像头都停止使用，主动收起隐私弹窗
      hidePrivacyPopup();
    }

    setLastPrivacyUsage(next);
  });

  // 更高优先级弹层抢占时，隐私自动让位
  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (capsule.classList.contains("privacy-active") && e.detail.priority > PRIVACY_PRIORITY) {
      hidePrivacyPopup();
    }
  }) as EventListener);
}
