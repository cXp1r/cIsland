import type { ViewMode } from "../types";
import { PageState } from "./page";
import {
  pageSubstateRegistry,
  TimeSubstateBridgeImpl,
  LyricSubstateBridgeImpl,
  AgentSubstateBridgeImpl,
  SadbSubstateBridgeImpl,
  EmailSubstateBridgeImpl,
  DownloaderSubstateBridgeImpl,
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
}

export type PageSubmachineMap = Partial<Record<PageState, PageSubmachine>>;

export interface PageStateMachineContract {
  state: PageState;
  readonly submachines: PageSubmachineMap;
  readonly substates: Readonly<{
    [PageState.Time]: TimeSubstateBridge;
    [PageState.Lyric]: LyricSubstateBridge;
    [PageState.Agent]: AgentSubstateBridge;
    [PageState.Sadb]: SadbSubstateBridge;
    [PageState.Email]: EmailSubstateBridge;
    [PageState.Downloader]: DownloaderSubstateBridge;
  }>;


  currentPageAsViewMode(): ViewMode;
  getSubmachine(page: PageState): PageSubmachine | undefined;
  createKey(page: PageState, state: string): string;
}

export class PageStateMachine implements PageStateMachineContract {
  private _currentPage: PageState = PageState.Time;

  readonly submachines: PageSubmachineMap = {};
  readonly substates = {
    [PageState.Time]: new TimeSubstateBridgeImpl(),
    [PageState.Lyric]: new LyricSubstateBridgeImpl(),
    [PageState.Agent]: new AgentSubstateBridgeImpl(),
    [PageState.Sadb]: new SadbSubstateBridgeImpl(),
    [PageState.Email]: new EmailSubstateBridgeImpl(),
    [PageState.Downloader]: new DownloaderSubstateBridgeImpl(),
  } as const;

  constructor() {
    for (const page of Object.keys(pageSubstateRegistry) as PageState[]) {
      const definition = pageSubstateRegistry[page];
      if (!definition) continue;
      this.submachines[page] = { page, definition };
    }
  }

  get state(): PageState {
    return this._currentPage;
  }

  set state(page: PageState) {
    this._currentPage = page;
  }
  
  currentPageAsViewMode(): ViewMode {
    return this._currentPage as ViewMode;
  }

  getSubmachine(page: PageState): PageSubmachine | undefined {
    return this.submachines[page];
  }

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }
}

export const pageStateMachine: PageStateMachineContract = new PageStateMachine();
