import { DispatchAction, PageState } from "../page";
import { PageSubstateMachine } from "./common";

export const TimePageSubstate = {
  Collapsed: "collapsed",
  Hover: "Hover",
  Expanded: "expanded",
} as const;

export type TimePageSubstate = (typeof TimePageSubstate)[keyof typeof TimePageSubstate];

export class TimePageSubstateMachine extends PageSubstateMachine<TimePageSubstate> {
  constructor() {
    super(PageState.Time, TimePageSubstate.Collapsed);
  }

  dispatch(action: DispatchAction): void {
    if ( action.tag != "click" ) return;
    const { target, event } = action;

    event.stopPropagation();
    this.debouncedAction(() => {
      if (this.state === "expanded" && target instanceof HTMLDivElement) {
        this.transitionTo(TimePageSubstate.Collapsed);
      } else {
        this.transitionTo(TimePageSubstate.Expanded);
      }
    });
  }
}

export const timePageSubstateMachine = new TimePageSubstateMachine();
