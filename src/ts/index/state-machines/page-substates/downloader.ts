import { PageState } from "../page";
import { invoke } from "@tauri-apps/api/core";
import { PageSubstateMachine, debouncedAction, type PageSubstateAction } from "./common";
import {
  downloaderClickTimer,
  isExpandAnimating,
  setDownloaderClickTimer,
  setIsExpandAnimating,
} from "../../state";

export const DownloaderPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Downloading: "downloading",
} as const;

export type DownloaderPageSubstate =
  (typeof DownloaderPageSubstate)[keyof typeof DownloaderPageSubstate];

export class DownloaderPageSubstateMachine extends PageSubstateMachine<DownloaderPageSubstate> {
  constructor() {
    super(PageState.Downloader, DownloaderPageSubstate.Collapsed);
  }

  expand(): void {
    this.dispatch(DownloaderPageSubstate.Expanded);
  }

  collapse(): void {
    this.dispatch(DownloaderPageSubstate.Collapsed);
  }

  downloading(): void {
    this.dispatch(DownloaderPageSubstate.Downloading);
  }

  protected override handleAction(action: PageSubstateAction): void {
    if (action.type !== "click") return;
    const { target, event } = action;
    if (!(target instanceof HTMLDivElement)) return;
    event.stopPropagation();
    debouncedAction(downloaderClickTimer, setDownloaderClickTimer, () => {
      if (isExpandAnimating) return;
      setIsExpandAnimating(true);
      if (this.getState() === DownloaderPageSubstate.Collapsed) {
        this.expand();
        void invoke("set_expanded", { expanded: true });
        window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
      } else {
        window.setTimeout(() => {
          this.collapse();
          void invoke("set_expanded", { expanded: false });
          window.setTimeout(() => {
            setIsExpandAnimating(false);
          }, 50);
        }, 100);
      }
    });
  }
}

export const downloaderPageSubstateMachine = new DownloaderPageSubstateMachine();
