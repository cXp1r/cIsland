import type { ViewMode } from "../types";

export const PageState = {
  Time: "time",
  Lyric: "lyric",
  Agent: "agent",
  Sadb: "sadb",
  Email: "email",
  Downloader: "downloader",
} as const;

export type PageState = (typeof PageState)[keyof typeof PageState];

export const PageTransitionSource = {
  DoubleClick: "double_click",
  DotClick: "dot_click",
  Restore: "restore",
  Programmatic: "programmatic",
} as const;

export type PageTransitionSource =
  (typeof PageTransitionSource)[keyof typeof PageTransitionSource];

export const PageEventType = {
  SwitchTo: "switch_to",
  SwitchNext: "switch_next",
  RestoreUserPage: "restore_user_page",
  PageCapabilityChanged: "page_capability_changed",
} as const;

export type PageEventType = (typeof PageEventType)[keyof typeof PageEventType];

export const PageSet = new Set<ViewMode>([
  PageState.Time,
  PageState.Lyric,
  PageState.Agent,
  PageState.Sadb,
  PageState.Email,
  PageState.Downloader,
]);

export function isPageState(v: string): v is PageState {
  return PageSet.has(v as ViewMode);
}

export function getAvailablePages(availablePages: ViewMode[]): PageState[] {
  return availablePages.filter(isPageState) as PageState[];
}

export function resolveNextAvailablePage(
  availablePages: PageState[],
  current: PageState,
  direction: 1 | -1,
): PageState {
  if (availablePages.length === 0) return current;

  const currentIndex = availablePages.indexOf(current);
  if (currentIndex < 0) return availablePages[0];

  const offset = direction >= 0 ? 1 : -1;
  const nextIndex = (((currentIndex + offset) % availablePages.length) + availablePages.length)
    % availablePages.length;
  return availablePages[nextIndex];
}
