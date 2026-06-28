import { PageState } from "../types";
import { PageSubstateMachine } from "../substate-machine";
import type { DispatchAction } from "../types";

export const LyricPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
} as const;

export type LyricPageSubstate =
  (typeof LyricPageSubstate)[keyof typeof LyricPageSubstate];

export class LyricPageSubstateMachine
  extends PageSubstateMachine<LyricPageSubstate> {
  constructor() {
    super(PageState.Music, LyricPageSubstate.Collapsed);
  }

  dispatch(action: DispatchAction): void {
    if (action.tag !== "click") return;
    const { target, event } = action;

    if (this.state !== LyricPageSubstate.Expanded && (
      target.closest(".media-btn")
      || target.closest(".progress-bar")
      || target.closest(".vol-btn")
    )) {
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
