import type { DispatchAction } from "../types";
import { PageState } from "../types";
import { PageSubstateMachine } from "../substate-machine";

export const TimePageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
} as const;

export type TimePageSubstate =
  (typeof TimePageSubstate)[keyof typeof TimePageSubstate];

export class TimePageSubstateMachine
  extends PageSubstateMachine<TimePageSubstate> {
  constructor() {
    super(PageState.Time, TimePageSubstate.Collapsed);
  }

  dispatch(action: DispatchAction): void {
    if (action.tag !== "click") return;
    const { target, event } = action;

    event.stopPropagation();
    this.debouncedAction(() => {
      if (this.state === TimePageSubstate.Expanded && target instanceof HTMLDivElement) {
        this.transitionTo(TimePageSubstate.Collapsed);
      } else {
        this.transitionTo(TimePageSubstate.Expanded);
      }
    });
  }
}

export const timePageSubstateMachine = new TimePageSubstateMachine();
