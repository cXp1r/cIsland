import type { ViewMode } from "../types";
import { isMusicPlaying, lyricMode, aiEnabled, emailConfigure, isAria2c, setUserChosenView } from "../state";
import { PageState } from "./page";
import { pageSubstateRegistry, type PageSubstateMachine } from "./page-substates";
import { getAvailablePages, resolveNextAvailablePage } from "./page";

export type PageSubmachine = PageSubstateMachine;

export class PageStateMachine {
  private _currentPage: PageState = PageState.Time;

  readonly substates = pageSubstateRegistry;

  private getAvailableViews(): ViewMode[] {
    const views: ViewMode[] = [PageState.Time];
    if (isMusicPlaying && lyricMode !== "off") {
      views.push(PageState.Lyric);
    }
    if (aiEnabled) {
      views.push(PageState.Agent);
    }
    views.push(PageState.Sadb);
    if (emailConfigure) {
      views.push(PageState.Email);
    }
    if (isAria2c) {
      views.push(PageState.Downloader);
    }
    return views;
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
    return this.substates[page];
  }

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }

  async switchToNextView(direction: 1 | -1 = 1): Promise<ViewMode | undefined> {
    const views = this.getAvailableViews();
    const pageViews = getAvailablePages(views);
    if (pageViews.length < 2) return undefined;

    const nextView = resolveNextAvailablePage(
      pageViews,
      this._currentPage,
      direction >= 0 ? 1 : -1,
    );
    const { playSwitchPulse, setView } = await import("../modules/view-switcher");
    playSwitchPulse();
    setUserChosenView(nextView);
    setView(nextView, true);
    return nextView;
  }
}

export const pageStateMachine = new PageStateMachine();
