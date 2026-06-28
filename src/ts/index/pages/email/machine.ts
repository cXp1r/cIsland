import { PageState } from "../types";
import { PageSubstateMachine } from "../substate-machine";
import type { DispatchAction } from "../types";

export const EmailPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
} as const;

export type EmailPageSubstate =
  (typeof EmailPageSubstate)[keyof typeof EmailPageSubstate];

export class EmailPageSubstateMachine
  extends PageSubstateMachine<EmailPageSubstate> {
  constructor() {
    super(PageState.Email, EmailPageSubstate.Collapsed);
  }

  dispatch(action: DispatchAction): void {
    if (action.tag !== "click") return;
    action.event.stopPropagation();
    this.debouncedAction(() => {
      if (this.state === EmailPageSubstate.Expanded) {
        this.transitionTo(EmailPageSubstate.Collapsed);
      } else {
        this.transitionTo(EmailPageSubstate.Expanded);
      }
    });
  }
}

export const emailPageSubstateMachine = new EmailPageSubstateMachine();
