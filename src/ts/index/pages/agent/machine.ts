import { PageState } from "../types";
import { PageSubstateMachine } from "../substate-machine";
import type { DispatchAction } from "../types";

export const AgentPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Thinking: "thinking",
  Generating: "generating",
} as const;

export type AgentPageSubstate =
  (typeof AgentPageSubstate)[keyof typeof AgentPageSubstate];

export class AgentPageSubstateMachine
  extends PageSubstateMachine<AgentPageSubstate> {
  constructor() {
    super(PageState.Agent, AgentPageSubstate.Collapsed);
  }

  thinking(): void {
    this.transitionTo(AgentPageSubstate.Thinking);
  }

  generating(): void {
    this.transitionTo(AgentPageSubstate.Generating);
  }

  dispatch(action: DispatchAction): void {
    if (action.tag !== "click") return;
    const { target, event } = action;

    const agentState = this.state;
    if (agentState !== AgentPageSubstate.Collapsed) {
      if (!target.closest("#agent-status-bar") || target.closest("#agent-clear-btn")) return;
    } else if (
      target.closest("#agent-input")
      || target.closest("#agent-send-btn")
      || target.closest("#agent-stop-btn")
      || target.closest("#agent-clear-btn")
      || target.closest(".thinking-section")
      || target.closest("#agent-messages")
      || target.closest("#agent-confirm-dialog")
    ) {
      return;
    }

    event.stopPropagation();
    this.debouncedAction(() => {
      if (this.state === AgentPageSubstate.Collapsed) {
        this.transitionTo(AgentPageSubstate.Expanded);
      } else {
        window.setTimeout(() => {
          this.transitionTo(AgentPageSubstate.Collapsed);
        }, 100);
      }
    });
  }
}

export const agentPageSubstateMachine = new AgentPageSubstateMachine();
