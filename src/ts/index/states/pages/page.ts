import { $ } from "../../../utils/shared";

export const PageState = {
  Time: "time",
  Music: "music",
  Agent: "agent",
  Sadb: "sadb",
  Email: "email",
  Downloader: "downloader",
} as const;

export type PageState = (typeof PageState)[keyof typeof PageState];

export const PageStateOrder = [
  PageState.Time,
  PageState.Music,
  PageState.Agent,
  PageState.Sadb,
  PageState.Email,
  PageState.Downloader,
] as const;


export const pagesElements: Record<PageState, HTMLElement> = {
  time: $<HTMLDivElement>("time-area"),
  music: $<HTMLDivElement>("music-area"),
  agent: $<HTMLDivElement>("agent-area"),
  sadb: $<HTMLDivElement>("sadb-area"),
  email: $<HTMLDivElement>("email-area"),
  downloader: $<HTMLDivElement>("downloader-area"),
};




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

export type DispatchAction =
  | {
      tag: "click";
      target: HTMLElement;
      event: MouseEvent;
    }
  | {
      tag: "dbclick";
      target: HTMLElement;
      event: MouseEvent;
    }
  | {
      tag: "key";
      event: KeyboardEvent;
    }
  | {
      tag: "core";
      event: string;
    }
  | {
      tag: "hover";
      event: boolean;
    }
  | {
      tag: "conditional";
      event: "downloader";
    }
  | {
      tag: "chosen";
      target: PageState;
    }
  | {
      tag: "wheel";
      target: -1 | 1;
  };
