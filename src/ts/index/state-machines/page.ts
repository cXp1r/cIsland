import type { ViewMode } from "../types";

export const ManualPageState = {
  Time: "time",
  Lyric: "lyric",
  Agent: "agent",
  Sadb: "sadb",
  Email: "email",
  Downloader: "downloader",
} as const;

export type ManualPageState = (typeof ManualPageState)[keyof typeof ManualPageState];

export const ManualPageTransitionSource = {
  DoubleClick: "double_click",
  DotClick: "dot_click",
  Restore: "restore",
  Programmatic: "programmatic",
} as const;

export type ManualPageTransitionSource =
  (typeof ManualPageTransitionSource)[keyof typeof ManualPageTransitionSource];

export const ManualPageEventType = {
  SwitchTo: "switch_to",
  SwitchNext: "switch_next",
  RestoreUserPage: "restore_user_page",
  PageCapabilityChanged: "page_capability_changed",
} as const;

export type ManualPageEventType = (typeof ManualPageEventType)[keyof typeof ManualPageEventType];

export const ManualPageSet = new Set<ViewMode>([
  ManualPageState.Time,
  ManualPageState.Lyric,
  ManualPageState.Agent,
  ManualPageState.Sadb,
  ManualPageState.Email,
  ManualPageState.Downloader,
]);

export function isManualPageState(v: string): v is ManualPageState {
  return ManualPageSet.has(v as ViewMode);
}

export function getAvailableManualPages(availablePages: ViewMode[]): ManualPageState[] {
  return availablePages.filter(isManualPageState) as ManualPageState[];
}

export function resolveNextAvailablePage(
  availablePages: ManualPageState[],
  current: ManualPageState,
  direction: 1 | -1,
): ManualPageState {
  if (availablePages.length === 0) return current;

  const currentIndex = availablePages.indexOf(current);
  if (currentIndex < 0) return availablePages[0];

  const offset = direction >= 0 ? 1 : -1;
  const nextIndex = (((currentIndex + offset) % availablePages.length) + availablePages.length)
    % availablePages.length;
  return availablePages[nextIndex];
}
