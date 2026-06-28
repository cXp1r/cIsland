import { PageState } from "../types";
import { PageSubstateMachine } from "../substate-machine";
import type { DispatchAction } from "../types";

export const DownloaderPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Downloading: "downloading",
} as const;

export type DownloaderPageSubstate =
  (typeof DownloaderPageSubstate)[keyof typeof DownloaderPageSubstate];

export class DownloaderPageSubstateMachine
  extends PageSubstateMachine<DownloaderPageSubstate> {
  constructor() {
    super(PageState.Downloader, DownloaderPageSubstate.Collapsed);
  }

  downloading(): void {
    this.transitionTo(DownloaderPageSubstate.Downloading);
  }

  dispatch(action: DispatchAction): void {
    if (action.tag !== "click") return;
    const { target, event } = action;

    if (!(target instanceof HTMLDivElement)) return;
    event.stopPropagation();
    this.debouncedAction(() => {
      if (this.state === DownloaderPageSubstate.Collapsed) {
        this.transitionTo(DownloaderPageSubstate.Expanded);
      } else {
        window.setTimeout(() => {
          this.transitionTo(DownloaderPageSubstate.Collapsed);
        }, 100);
      }
    });
  }
}

export const downloaderPageSubstateMachine = new DownloaderPageSubstateMachine();
