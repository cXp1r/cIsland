import { DispatchAction, PageState } from "../page";
import { PageSubstateMachine } from "./common";


export const SadbPageSubstate = {
  Collapsed: "collapsed",
  Hover: "Hover",
  IdlePanel: "idle_panel",
  Mirroring: "mirroring",
} as const;

export type SadbPageSubstate = (typeof SadbPageSubstate)[keyof typeof SadbPageSubstate];

export class SadbPageSubstateMachine extends PageSubstateMachine<SadbPageSubstate> {
  constructor() {
    super(PageState.Sadb, SadbPageSubstate.Collapsed);
  }

  dispatch(action: DispatchAction): void {
    if ( action.tag != "click" ) return;
    const { target, event } = action;

    const sadbState = this.state;

    if (sadbState === SadbPageSubstate.Mirroring) return;
    if (sadbState === SadbPageSubstate.IdlePanel) {
      if (!target.closest("#sadb-status-bar")) return;
      event.stopPropagation();
      this.debouncedAction(() => {
        this.transitionTo(SadbPageSubstate.Collapsed);
      });
      return;
    }

    if (
      target.closest("#sadb-btn-start")
      || target.closest("#sadb-btn-stop")
      || target.closest("#sadb-canvas")
    ) return;

    event.stopPropagation();
    this.debouncedAction(() => {
      this.transitionTo(SadbPageSubstate.IdlePanel);
    });
  }
}

export const sadbPageSubstateMachine = new SadbPageSubstateMachine();
