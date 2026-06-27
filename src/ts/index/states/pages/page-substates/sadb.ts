import { DispatchAction, PageState } from "../page";
import { PageSubstateMachine } from "./common";


export const SadbPageSubstate = {
  Collapsed: "collapsed",
  Idle: "idle",
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
    if (sadbState === SadbPageSubstate.Idle) {
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
      this.transitionTo(SadbPageSubstate.Idle);
    });
  }
}

export const sadbPageSubstateMachine = new SadbPageSubstateMachine();
