import { capsule } from "../dom";
import type { ViewMode } from "../types";
import { PageState, isPageState } from "./page";
import {
  getPageSubstateInitialState,
  pageSubstateRegistry,
  TimeSubstateBridgeImpl,
  LyricSubstateBridgeImpl,
  AgentSubstateBridgeImpl,
  SadbSubstateBridgeImpl,
  EmailSubstateBridgeImpl,
  DownloaderSubstateBridgeImpl,
  TimePageSubstate,
  LyricPageSubstate,
  AgentPageSubstate,
  SadbPageSubstate,
  EmailPageSubstate,
  DownloaderPageSubstate,
  type PageSubstateDefinition,
  type TimeSubstateBridge,
  type LyricSubstateBridge,
  type AgentSubstateBridge,
  type SadbSubstateBridge,
  type EmailSubstateBridge,
  type DownloaderSubstateBridge,
} from "./page-substates";

export interface PageSubmachine<S extends string = string> {
  page: PageState;
  definition: PageSubstateDefinition<S>;
  currentState: S;
}

export type PageSubmachineMap = Partial<Record<PageState, PageSubmachine>>;
export type PageCapsuleClassSnapshotMap = Partial<Record<PageState, string>>;

export interface PageStateMachine {
  state: PageState;
  currentPage: PageState;
  readonly submachines: PageSubmachineMap;
  readonly substates: Readonly<{
    [PageState.Time]: TimeSubstateBridge;
    [PageState.Lyric]: LyricSubstateBridge;
    [PageState.Agent]: AgentSubstateBridge;
    [PageState.Sadb]: SadbSubstateBridge;
    [PageState.Email]: EmailSubstateBridge;
    [PageState.Downloader]: DownloaderSubstateBridge;
  }>;

  getCurrentPage(): PageState;
  setCurrentPage(page: PageState): void;
  currentPageAsViewMode(): ViewMode;

  getSubmachine(page: PageState): PageSubmachine | undefined;
  getSubmachineState(page: PageState): string | undefined;
  createKey(page: PageState, state: string): string;

  getPageState(page: PageState): string | undefined;
  setPageState(page: PageState, state: string): void;

  getPageClasses(page: PageState): string;
  setPageClasses(page: PageState, classValue: string): string;
  savePageClasses(page: PageState, classList: DOMTokenList): string | undefined;
  applyPageClasses(page: PageState, classList: DOMTokenList): string | undefined;
  syncPageState(page: PageState, classList: DOMTokenList): string | undefined;
}

const pageCapsuleClassDefaultSnapshotMap: Record<PageState, string> = {
  [PageState.Time]: "",
  [PageState.Lyric]: "lyric-collapsed",
  [PageState.Agent]: "",
  [PageState.Sadb]: "",
  [PageState.Email]: "",
  [PageState.Downloader]: "",
};

class PageStateMachineImpl implements PageStateMachine {
  private _currentPage: PageState = PageState.Time;

  readonly submachines: PageSubmachineMap = {};
  private readonly pageCapsuleClassSnapshotMap: PageCapsuleClassSnapshotMap = {
    [PageState.Time]: pageCapsuleClassDefaultSnapshotMap[PageState.Time],
    [PageState.Lyric]: pageCapsuleClassDefaultSnapshotMap[PageState.Lyric],
    [PageState.Agent]: pageCapsuleClassDefaultSnapshotMap[PageState.Agent],
    [PageState.Sadb]: pageCapsuleClassDefaultSnapshotMap[PageState.Sadb],
    [PageState.Email]: pageCapsuleClassDefaultSnapshotMap[PageState.Email],
    [PageState.Downloader]: pageCapsuleClassDefaultSnapshotMap[PageState.Downloader],
  };

  readonly substates = {
    [PageState.Time]: new TimeSubstateBridgeImpl((state) => {
      this.setPageState(PageState.Time, state);
      this.savePageClasses(PageState.Time, capsule.classList);
    }),
    [PageState.Lyric]: new LyricSubstateBridgeImpl((state) => {
      this.setPageState(PageState.Lyric, state);
      this.savePageClasses(PageState.Lyric, capsule.classList);
    }),
    [PageState.Agent]: new AgentSubstateBridgeImpl((state) => {
      this.setPageState(PageState.Agent, state);
      this.savePageClasses(PageState.Agent, capsule.classList);
    }),
    [PageState.Sadb]: new SadbSubstateBridgeImpl((state) => {
      this.setPageState(PageState.Sadb, state);
      this.savePageClasses(PageState.Sadb, capsule.classList);
    }),
    [PageState.Email]: new EmailSubstateBridgeImpl((state) => {
      this.setPageState(PageState.Email, state);
      this.savePageClasses(PageState.Email, capsule.classList);
    }),
    [PageState.Downloader]: new DownloaderSubstateBridgeImpl((state) => {
      this.setPageState(PageState.Downloader, state);
      this.savePageClasses(PageState.Downloader, capsule.classList);
    }),
  } as const;

  constructor() {
    for (const page of Object.keys(pageSubstateRegistry) as PageState[]) {
      const definition = pageSubstateRegistry[page];
      if (!definition) continue;
      this.submachines[page] = {
        page,
        definition,
        currentState: getPageSubstateInitialState(definition),
      };
    }
  }

  get state(): PageState {
    return this._currentPage;
  }

  set state(page: PageState) {
    this._currentPage = page;
  }

  get currentPage(): PageState {
    return this._currentPage;
  }

  set currentPage(page: PageState) {
    this._currentPage = page;
  }

  getCurrentPage(): PageState {
    return this._currentPage;
  }

  setCurrentPage(page: PageState): void {
    this._currentPage = page;
  }

  currentPageAsViewMode(): ViewMode {
    return this._currentPage as ViewMode;
  }

  getSubmachine(page: PageState): PageSubmachine | undefined {
    return this.submachines[page];
  }

  getSubmachineState(page: PageState): string | undefined {
    return this.submachines[page]?.currentState;
  }

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }

  getPageState(page: PageState): string | undefined {
    return this.submachines[page]?.currentState;
  }

  setPageState(page: PageState, state: string): void {
    const machine = this.submachines[page];
    if (!machine || machine.currentState === state) return;
    machine.currentState = state;
  }

  getPageClasses(page: PageState): string {
    return this.pageCapsuleClassSnapshotMap[page] ?? pageCapsuleClassDefaultSnapshotMap[page];
  }

  setPageClasses(page: PageState, classValue: string): string {
    this.pageCapsuleClassSnapshotMap[page] = classValue;
    return classValue;
  }

  savePageClasses(page: PageState, classList: DOMTokenList): string | undefined {
    if (!isPageState(page)) return undefined;
    return this.setPageClasses(page, classList.value);
  }

  applyPageClasses(page: PageState, classList: DOMTokenList): string | undefined {
    if (!isPageState(page)) return undefined;

    const snapshot = this.getPageClasses(page);
    classList.value = snapshot;
    return snapshot;
  }

  private inferCurrentPageSubmachineState(page: PageState, classList: DOMTokenList): string {
    const machine = this.submachines[page];
    if (!machine) return "";

    switch (page) {
      case PageState.Time:
        return classList.contains("panel-expanded")
          ? TimePageSubstate.Expanded
          : TimePageSubstate.Collapsed;
      case PageState.Lyric:
        if (classList.contains("music-expanded")) return LyricPageSubstate.Expanded;
        return machine.currentState === LyricPageSubstate.Seeking
          ? machine.currentState
          : LyricPageSubstate.Collapsed;
      case PageState.Agent:
        if (classList.contains("agent-expanded")) return AgentPageSubstate.Expanded;
        return machine.currentState === AgentPageSubstate.Thinking
          || machine.currentState === AgentPageSubstate.Generating
          ? machine.currentState
          : AgentPageSubstate.Collapsed;
      case PageState.Sadb:
        if (classList.contains("sadb-expanded")) return SadbPageSubstate.Mirroring;
        if (classList.contains("sadb-idle")) return SadbPageSubstate.IdlePanel;
        return machine.currentState;
      case PageState.Email:
        if (classList.contains("email-expanded")) return EmailPageSubstate.Expanded;
        return machine.currentState === EmailPageSubstate.Dragging
          ? machine.currentState
          : EmailPageSubstate.Collapsed;
      case PageState.Downloader:
        if (classList.contains("downloader-expanded")) return DownloaderPageSubstate.Expanded;
        return machine.currentState === DownloaderPageSubstate.Downloading
          ? machine.currentState
          : DownloaderPageSubstate.Collapsed;
      default:
        return machine.currentState;
    }
  }

  syncPageState(page: PageState, classList: DOMTokenList): string | undefined {
    if (!isPageState(page)) return undefined;

    this.savePageClasses(page, classList);

    const nextState = this.inferCurrentPageSubmachineState(page, classList);
    if (nextState) {
      this.setPageState(page, nextState);
    }
    return nextState || undefined;
  }
}

export const pageStateMachine: PageStateMachine = new PageStateMachineImpl();
