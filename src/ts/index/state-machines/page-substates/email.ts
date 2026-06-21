import { PageState } from "../page";
import { invoke } from "@tauri-apps/api/core";
import { PageSubstateMachine, debouncedAction, type PageSubstateAction } from "./common";
import { emailClickTimer, setEmailClickTimer } from "../../state";

export const EmailPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Dragging: "dragging",
} as const;

export type EmailPageSubstate = (typeof EmailPageSubstate)[keyof typeof EmailPageSubstate];

export class EmailPageSubstateMachine extends PageSubstateMachine<EmailPageSubstate> {
  constructor() {
    super(PageState.Email, EmailPageSubstate.Collapsed);
  }

  expand(): void {
    this.dispatch(EmailPageSubstate.Expanded);
  }

  collapse(): void {
    this.dispatch(EmailPageSubstate.Collapsed);
  }

  dragging(): void {
    this.dispatch(EmailPageSubstate.Dragging);
  }

  protected override handleAction(action: PageSubstateAction): void {
    if (action.type !== "click") return;
    const { event } = action;
    event.stopPropagation();
    debouncedAction(emailClickTimer, setEmailClickTimer, () => {
      if (this.getState() === EmailPageSubstate.Expanded) {
        this.collapse();
        void invoke("set_expanded", { expanded: false });
      } else {
        this.expand();
        void invoke("set_expanded", { expanded: true });
      }
    });
  }
}

export const emailPageSubstateMachine = new EmailPageSubstateMachine();
