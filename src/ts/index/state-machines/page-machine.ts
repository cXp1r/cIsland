import { capsule } from "../dom";
import type { ViewMode } from "../types";
import { ManualPageState, isManualPageState } from "./page";
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

export interface ManualPageSubmachine<S extends string = string> {
  page: ManualPageState;
  definition: PageSubstateDefinition<S>;
  currentState: S;
}

export type ManualPageSubmachineMap = Partial<Record<ManualPageState, ManualPageSubmachine>>;
export type ManualPageCapsuleClassSnapshotMap = Partial<Record<ManualPageState, string>>;

export interface PageStateMachine {
  state: ManualPageState;
  currentPage: ManualPageState;
  readonly submachines: ManualPageSubmachineMap;
  readonly substates: Readonly<{
    [ManualPageState.Time]: TimeSubstateBridge;
    [ManualPageState.Lyric]: LyricSubstateBridge;
    [ManualPageState.Agent]: AgentSubstateBridge;
    [ManualPageState.Sadb]: SadbSubstateBridge;
    [ManualPageState.Email]: EmailSubstateBridge;
    [ManualPageState.Downloader]: DownloaderSubstateBridge;
  }>;

  getCurrentPage(): ManualPageState;
  setCurrentPage(page: ManualPageState): void;
  currentPageAsViewMode(): ViewMode;

  getSubmachine(page: ManualPageState): ManualPageSubmachine | undefined;
  getSubmachineState(page: ManualPageState): string | undefined;
  createKey(page: ManualPageState, state: string): string;

  getPageState(page: ManualPageState): string | undefined;
  setPageState(page: ManualPageState, state: string): void;

  getPageClasses(page: ManualPageState): string;
  setPageClasses(page: ManualPageState, classValue: string): string;
  savePageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined;
  applyPageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined;
  syncPageState(page: ManualPageState, classList: DOMTokenList): string | undefined;
}

const pageCapsuleClassDefaultSnapshotMap: Record<ManualPageState, string> = {
  [ManualPageState.Time]: "",
  [ManualPageState.Lyric]: "lyric-collapsed",
  [ManualPageState.Agent]: "",
  [ManualPageState.Sadb]: "",
  [ManualPageState.Email]: "",
  [ManualPageState.Downloader]: "",
};

class PageStateMachineImpl implements PageStateMachine {
  private _currentPage: ManualPageState = ManualPageState.Time;

  readonly submachines: ManualPageSubmachineMap = {};
  private readonly pageCapsuleClassSnapshotMap: ManualPageCapsuleClassSnapshotMap = {
    [ManualPageState.Time]: pageCapsuleClassDefaultSnapshotMap[ManualPageState.Time],
    [ManualPageState.Lyric]: pageCapsuleClassDefaultSnapshotMap[ManualPageState.Lyric],
    [ManualPageState.Agent]: pageCapsuleClassDefaultSnapshotMap[ManualPageState.Agent],
    [ManualPageState.Sadb]: pageCapsuleClassDefaultSnapshotMap[ManualPageState.Sadb],
    [ManualPageState.Email]: pageCapsuleClassDefaultSnapshotMap[ManualPageState.Email],
    [ManualPageState.Downloader]: pageCapsuleClassDefaultSnapshotMap[ManualPageState.Downloader],
  };

  readonly substates = {
    [ManualPageState.Time]: new TimeSubstateBridgeImpl((state) => {
      this.setPageState(ManualPageState.Time, state);
      this.savePageClasses(ManualPageState.Time, capsule.classList);
    }),
    [ManualPageState.Lyric]: new LyricSubstateBridgeImpl((state) => {
      this.setPageState(ManualPageState.Lyric, state);
      this.savePageClasses(ManualPageState.Lyric, capsule.classList);
    }),
    [ManualPageState.Agent]: new AgentSubstateBridgeImpl((state) => {
      this.setPageState(ManualPageState.Agent, state);
      this.savePageClasses(ManualPageState.Agent, capsule.classList);
    }),
    [ManualPageState.Sadb]: new SadbSubstateBridgeImpl((state) => {
      this.setPageState(ManualPageState.Sadb, state);
      this.savePageClasses(ManualPageState.Sadb, capsule.classList);
    }),
    [ManualPageState.Email]: new EmailSubstateBridgeImpl((state) => {
      this.setPageState(ManualPageState.Email, state);
      this.savePageClasses(ManualPageState.Email, capsule.classList);
    }),
    [ManualPageState.Downloader]: new DownloaderSubstateBridgeImpl((state) => {
      this.setPageState(ManualPageState.Downloader, state);
      this.savePageClasses(ManualPageState.Downloader, capsule.classList);
    }),
  } as const;

  constructor() {
    for (const page of Object.keys(pageSubstateRegistry) as ManualPageState[]) {
      const definition = pageSubstateRegistry[page];
      if (!definition) continue;
      this.submachines[page] = {
        page,
        definition,
        currentState: getPageSubstateInitialState(definition),
      };
    }
  }

  get state(): ManualPageState {
    return this._currentPage;
  }

  set state(page: ManualPageState) {
    this._currentPage = page;
  }

  get currentPage(): ManualPageState {
    return this._currentPage;
  }

  set currentPage(page: ManualPageState) {
    this._currentPage = page;
  }

  getCurrentPage(): ManualPageState {
    return this._currentPage;
  }

  setCurrentPage(page: ManualPageState): void {
    this._currentPage = page;
  }

  currentPageAsViewMode(): ViewMode {
    return this._currentPage as ViewMode;
  }

  getSubmachine(page: ManualPageState): ManualPageSubmachine | undefined {
    return this.submachines[page];
  }

  getSubmachineState(page: ManualPageState): string | undefined {
    return this.submachines[page]?.currentState;
  }

  createKey(page: ManualPageState, state: string): string {
    return `${page}:${state}`;
  }

  getPageState(page: ManualPageState): string | undefined {
    return this.submachines[page]?.currentState;
  }

  setPageState(page: ManualPageState, state: string): void {
    const machine = this.submachines[page];
    if (!machine || machine.currentState === state) return;
    machine.currentState = state;
  }

  getPageClasses(page: ManualPageState): string {
    return this.pageCapsuleClassSnapshotMap[page] ?? pageCapsuleClassDefaultSnapshotMap[page];
  }

  setPageClasses(page: ManualPageState, classValue: string): string {
    this.pageCapsuleClassSnapshotMap[page] = classValue;
    return classValue;
  }

  savePageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined {
    if (!isManualPageState(page)) return undefined;
    return this.setPageClasses(page, classList.value);
  }

  applyPageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined {
    if (!isManualPageState(page)) return undefined;

    const snapshot = this.getPageClasses(page);
    classList.value = snapshot;
    return snapshot;
  }

  private inferCurrentPageSubmachineState(page: ManualPageState, classList: DOMTokenList): string {
    const machine = this.submachines[page];
    if (!machine) return "";

    switch (page) {
      case ManualPageState.Time:
        return classList.contains("panel-expanded")
          ? TimePageSubstate.Expanded
          : TimePageSubstate.Collapsed;
      case ManualPageState.Lyric:
        if (classList.contains("music-expanded")) return LyricPageSubstate.Expanded;
        return machine.currentState === LyricPageSubstate.Seeking
          ? machine.currentState
          : LyricPageSubstate.Collapsed;
      case ManualPageState.Agent:
        if (classList.contains("agent-expanded")) return AgentPageSubstate.Expanded;
        return machine.currentState === AgentPageSubstate.Thinking
          || machine.currentState === AgentPageSubstate.Generating
          ? machine.currentState
          : AgentPageSubstate.Collapsed;
      case ManualPageState.Sadb:
        if (classList.contains("sadb-expanded")) return SadbPageSubstate.Mirroring;
        if (classList.contains("sadb-idle")) return SadbPageSubstate.IdlePanel;
        return machine.currentState;
      case ManualPageState.Email:
        if (classList.contains("email-expanded")) return EmailPageSubstate.Expanded;
        return machine.currentState === EmailPageSubstate.Dragging
          ? machine.currentState
          : EmailPageSubstate.Collapsed;
      case ManualPageState.Downloader:
        if (classList.contains("downloader-expanded")) return DownloaderPageSubstate.Expanded;
        return machine.currentState === DownloaderPageSubstate.Downloading
          ? machine.currentState
          : DownloaderPageSubstate.Collapsed;
      default:
        return machine.currentState;
    }
  }

  syncPageState(page: ManualPageState, classList: DOMTokenList): string | undefined {
    if (!isManualPageState(page)) return undefined;

    this.savePageClasses(page, classList);

    const nextState = this.inferCurrentPageSubmachineState(page, classList);
    if (nextState) {
      this.setPageState(page, nextState);
    }
    return nextState || undefined;
  }
}

export const pageStateMachine: PageStateMachine = new PageStateMachineImpl();
