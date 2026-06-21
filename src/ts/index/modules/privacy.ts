import { listen } from "@tauri-apps/api/event";
import type { PrivacyUsagePayload } from "../types";
import { capsule, privacyIndicators, privacyMic, privacyCamera } from "../dom";
import { OverlayPriority } from "../state-machines/overlay";
import { overlayStateMachine } from "../state-machines/overlay-machine";
import {
  privacyPopupTimer, setPrivacyPopupTimer,
  lastPrivacyUsage, setLastPrivacyUsage,
} from "../state";

const PRIVACY_PRIORITY = OverlayPriority.Privacy;

export function hidePrivacyPopup() {
  if (privacyPopupTimer) {
    clearTimeout(privacyPopupTimer);
    setPrivacyPopupTimer(null);
  }

  capsule.classList.remove("privacy-active");
  privacyIndicators.classList.remove("active");
  privacyMic.classList.remove("active");
  privacyCamera.classList.remove("active");

  if (overlayStateMachine.priority === PRIVACY_PRIORITY) {
    overlayStateMachine.setPriority(OverlayPriority.None);
  }
}

function showPrivacyPopup(payload: PrivacyUsagePayload) {
  const { microphone, camera } = payload;
  if (!microphone && !camera) return;

  // AI 婢堆冪潌鐏炴洖绱戦弮鏈电瑝閺勫墽銇氶梾鎰潌濡偓濞?  if (capsule.classList.contains("agent-expanded")) return;

  // 娴兼ê鍘涚痪褌绗夋径鐕傜礉娑撳秵妯夌粈鐚寸礄瑜版挸澧犻張澶嬫纯妤傛ü绱崗鍫㈤獓瀵懓鐪伴敍?  if (overlayStateMachine.canPreempt(overlayStateMachine.priority, PRIVACY_PRIORITY)) return;

  overlayStateMachine.setPriority(PRIVACY_PRIORITY);

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
      // 妤癸箑鍘犳搴℃嫲閹藉嫬鍎氭径鎾厴閸嬫粍顒涙担璺ㄦ暏閿涘奔瀵岄崝銊︽暪鐠х兘娈ｇ粔浣歌剨缁?      hidePrivacyPopup();
    }

    setLastPrivacyUsage(next);
  });

  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (capsule.classList.contains("privacy-active") && overlayStateMachine.canPreempt(e.detail.priority as typeof PRIVACY_PRIORITY, PRIVACY_PRIORITY)) {
      hidePrivacyPopup();
    }
  }) as EventListener);
}
