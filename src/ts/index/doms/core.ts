import { $ } from "../../utils/shared";

export const capsule = $<HTMLDivElement>("island-capsule");
export const currentViewContainer = $<HTMLDivElement>("current-view");

export const viewHolder = $<HTMLDivElement>("view-holder");
export const timeWrapper = $<HTMLDivElement>("time-area");
export const panel = document.getElementById("panel") as HTMLDivElement;
export const noticeArea = $<HTMLDivElement>("notice-area");

export const agentHandler = $<HTMLDivElement>("agent-handler");

export const viewSwitcher = $<HTMLDivElement>("view-switcher");
export const viewDots = $<HTMLDivElement>("view-dots");

export const privacyIndicators = $<HTMLDivElement>("privacy-indicators");
export const privacyMic = $<HTMLDivElement>("privacy-mic");
export const privacyCamera = $<HTMLDivElement>("privacy-camera");

export const sadbArea = $<HTMLDivElement>("sadb-area");
