import { PageState } from "../types";
import { PageSubstateMachine } from "../substate-machine";
import type { DispatchAction } from "../types";

export const LyricPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
} as const;

export type LyricPageSubstate =
  (typeof LyricPageSubstate)[keyof typeof LyricPageSubstate];

function isMusicControlTarget(target: HTMLElement): boolean {
  return !!target.closest([
    ".media-btn",
    ".progress-bar",
    ".vol-btn",
    "#music-panel-header",
    "#music-panel-controls",
    "#music-panel-progress",
    "#music-panel-volume",
    ".mp-btn",
    ".mp-progress-bar",
    ".mp-volume-bar",
  ].join(","));
}

export class LyricPageSubstateMachine
  extends PageSubstateMachine<LyricPageSubstate> {
  constructor() {
    super(PageState.Music, LyricPageSubstate.Collapsed);
  }

  dispatch(action: DispatchAction): void {
    if (action.tag !== "click") return;
    const { target, event } = action;

    if (isMusicControlTarget(target)) {
      return;
    }

    event.stopPropagation();
    this.debouncedAction(() => {
      if (this.state !== LyricPageSubstate.Expanded) {
        this.transitionTo(LyricPageSubstate.Expanded);
      } else {
        this.transitionTo(LyricPageSubstate.Collapsed);
      }
    });
  }
}

export const lyricPageSubstateMachine = new LyricPageSubstateMachine();
