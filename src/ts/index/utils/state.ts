import { PageState } from "../pages/types";
import type { PrivacyUsagePayload } from "./types";

export type ViewMode = PageState | "search";

export function isPageState(value: ViewMode): value is PageState {
  return Object.values(PageState).includes(value as PageState);
}

export let panelClickTimer: number | null = null;
export function setPanelClickTimer(v: number | null) { panelClickTimer = v; }

export let noticeTimer: number | null = null;
export function setNoticeTimer(v: number | null) { noticeTimer = v; }

export let pendingUrls: string[] = [];
export function setPendingUrls(v: string[]) { pendingUrls = v; }

export let isShowingUrlList = false;
export function setIsShowingUrlList(v: boolean) { isShowingUrlList = v; }

export let privacyPopupTimer: number | null = null;
export function setPrivacyPopupTimer(v: number | null) { privacyPopupTimer = v; }

export let privacyPulseCleanupTimer: number | null = null;
export function setPrivacyPulseCleanupTimer(v: number | null) { privacyPulseCleanupTimer = v; }

export let lastPrivacyUsage: PrivacyUsagePayload = {
  microphone: false,
  camera: false,
};
export function setLastPrivacyUsage(v: PrivacyUsagePayload) { lastPrivacyUsage = v; }

export let isExpandAnimating = false;
export function setIsExpandAnimating(v: boolean) { isExpandAnimating = v; }

export let prevLineMap: Map<string, HTMLElement> = new Map();
export function setPrevLineMap(v: Map<string, HTMLElement>) { prevLineMap = v; }

export let aiEnabled = false;
export function setAiEnabled(v: boolean) { aiEnabled = v; }

export let aiGenerating = false;
export function setAiGenerating(v: boolean) { aiGenerating = v; }

export let currentAssistantMessage: HTMLDivElement | null = null;
export function setCurrentAssistantMessage(v: HTMLDivElement | null) { currentAssistantMessage = v; }

export let currentAssistantRawText = "";
export function setCurrentAssistantRawText(v: string) { currentAssistantRawText = v; }

export let currentThinkingSection: HTMLDivElement | null = null;
export function setCurrentThinkingSection(v: HTMLDivElement | null) { currentThinkingSection = v; }

export let thinkingStartTime = 0;
export function setThinkingStartTime(v: number) { thinkingStartTime = v; }

export let thinkingTimer: number | null = null;
export function setThinkingTimer(v: number | null) { thinkingTimer = v; }

export let currentView: ViewMode = "time";
export function setCurrentView(v: ViewMode) { currentView = v; }

export let userChosenView: ViewMode = "time";
export function setUserChosenView(v: ViewMode) { userChosenView = v; }

export let emailConfigure = false;
export function setEmailConfigure(v: boolean) { emailConfigure = v; }

export let emailClickTimer: number | null = null;
export function setEmailClickTimer(v: number | null) { emailClickTimer = v; }

export let cAFTimer: number | null = null;
export function setcAFTimer(v: number | null) { cAFTimer = v; }

export let isDragging = false;
export function setIsDragging(v: boolean) { isDragging = v; }

export let dragStarted = false;
export function setDragStarted(v: boolean) { dragStarted = v; }

export let lastX = 0;
export function setLastX(v: number) { lastX = v; }

export let lastY = 0;
export function setLastY(v: number) { lastY = v; }

export let mouseDownX = 0;
export function setMouseDownX(v: number) { mouseDownX = v; }

export let mouseDownY = 0;
export function setMouseDownY(v: number) { mouseDownY = v; }

export const DRAG_THRESHOLD = 5;

export let skipResizeSync = false;
export function setSkipResizeSync(v: boolean) { skipResizeSync = v; }

export let agentClickTimer: number | null = null;
export function setAgentClickTimer(v: number | null) { agentClickTimer = v; }

export let sadbClickTimer: number | null = null;
export function setSadbClickTimer(v: number | null) { sadbClickTimer = v; }

export let volThrottleTimer: number | null = null;
export function setVolThrottleTimer(v: number | null) { volThrottleTimer = v; }

export let currentAssistantContainer: HTMLDivElement | null = null;
export function setCurrentAssistantContainer(v: HTMLDivElement | null) { currentAssistantContainer = v; }

export let isAria2c = false;
export function setIsAria2c(v: boolean) { isAria2c = v; }

export let downloaderClickTimer: number | null = null;
export function setDownloaderClickTimer(v: number | null) { downloaderClickTimer = v; }
