import type { ViewMode } from "../types";
import { PageState } from "./page";
import { pageSubstateRegistry, type PageSubstateMachine } from "./page-substates";

export type PageSubmachine = PageSubstateMachine;

export class PageStateMachine {
  private _currentPage: PageState = PageState.Time;

  readonly substates = pageSubstateRegistry;

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
    return this.substates[page];
  }

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }
}

export const pageStateMachine = new PageStateMachine();
