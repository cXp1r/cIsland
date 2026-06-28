import type { PrivacyUsagePayload } from "../../utils/types";

export let privacyPopupTimer: number | null = null;
export function setPrivacyPopupTimer(v: number | null) { privacyPopupTimer = v; }

export let privacyPulseCleanupTimer: number | null = null;
export function setPrivacyPulseCleanupTimer(v: number | null) { privacyPulseCleanupTimer = v; }

export let lastPrivacyUsage: PrivacyUsagePayload = {
  microphone: false,
  camera: false,
};
export function setLastPrivacyUsage(v: PrivacyUsagePayload) { lastPrivacyUsage = v; }
