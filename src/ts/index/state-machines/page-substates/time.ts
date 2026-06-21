import { PageState } from "../page";
import { PageSubstateMachine, debouncedAction, type PageSubstateAction } from "./common";
import { invoke } from "@tauri-apps/api/core";
import { setPanelClickTimer, panelClickTimer } from "../../state";

export const TimePageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
} as const;

export type TimePageSubstate = (typeof TimePageSubstate)[keyof typeof TimePageSubstate];

export class TimePageSubstateMachine extends PageSubstateMachine<TimePageSubstate> {
  constructor() {
    super(PageState.Time, TimePageSubstate.Collapsed);
  }

  expand(): void {
    this.dispatch(TimePageSubstate.Expanded);
  }

  collapse(): void {
    this.dispatch(TimePageSubstate.Collapsed);
  }

  protected override handleAction(action: PageSubstateAction): void {
    if (action.type !== "click") return;
    const { target, event } = action;
    event.stopPropagation();
    debouncedAction(panelClickTimer, setPanelClickTimer, () => {
      if (this.getState() === "expanded" && target instanceof HTMLDivElement) {
        this.collapse();
        void invoke("set_expanded", { expanded: false });
      } else {
        this.expand();
        void invoke("set_expanded", { expanded: true });
      }
    });
  }
}

export const timePageSubstateMachine = new TimePageSubstateMachine();
