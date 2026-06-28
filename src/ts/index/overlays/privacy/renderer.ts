import type { PrivacyUsagePayload } from "../../utils/types";
import {
  capsule,
  privacyCamera,
  privacyIndicators,
  privacyMic,
} from "./dom";

export function isPrivacyPopupVisible(): boolean {
  return capsule.classList.contains("privacy-active");
}

export function isAgentExpanded(): boolean {
  return capsule.classList.contains("agent-expanded");
}

export function renderPrivacyPopup(payload: PrivacyUsagePayload): void {
  privacyMic.classList.toggle("active", payload.microphone);
  privacyCamera.classList.toggle("active", payload.camera);
  capsule.classList.add("privacy-active");
  privacyIndicators.classList.add("active");
}

export function clearPrivacyPopup(): void {
  capsule.classList.remove("privacy-active");
  privacyIndicators.classList.remove("active");
  privacyMic.classList.remove("active");
  privacyCamera.classList.remove("active");
}
