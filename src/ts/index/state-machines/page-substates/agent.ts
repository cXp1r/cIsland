import { PageState } from "../page";
import { invoke } from "@tauri-apps/api/core";
import { PageSubstateMachine, debouncedAction, type PageSubstateAction } from "./common";
import {
  agentClickTimer,
  isExpandAnimating,
  setAgentClickTimer,
  setIsExpandAnimating,
} from "../../state";

export const AgentPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Thinking: "thinking",
  Generating: "generating",
} as const;

export type AgentPageSubstate = (typeof AgentPageSubstate)[keyof typeof AgentPageSubstate];

export class AgentPageSubstateMachine extends PageSubstateMachine<AgentPageSubstate> {
  constructor() {
    super(PageState.Agent, AgentPageSubstate.Collapsed);
  }

  expand(): void {
    this.dispatch(AgentPageSubstate.Expanded);
  }

  collapse(): void {
    this.dispatch(AgentPageSubstate.Collapsed);
  }

  thinking(): void {
    this.dispatch(AgentPageSubstate.Thinking);
  }

  generating(): void {
    this.dispatch(AgentPageSubstate.Generating);
  }

  protected override handleAction(action: PageSubstateAction): void {
    if (action.type !== "click") return;
    const { target, event } = action;
    const agentState = this.getState();
    if (agentState !== AgentPageSubstate.Collapsed) {
      if (!target.closest("#agent-status-bar") || target.closest("#agent-clear-btn")) return;
    } else {
      if (
        target.closest("#agent-input")
        || target.closest("#agent-send-btn")
        || target.closest("#agent-stop-btn")
        || target.closest("#agent-clear-btn")
        || target.closest(".thinking-section")
        || target.closest("#agent-messages")
        || target.closest("#agent-confirm-dialog")
      ) return;
    }

    event.stopPropagation();
    debouncedAction(agentClickTimer, setAgentClickTimer, () => {
      if (isExpandAnimating) return;
      setIsExpandAnimating(true);

      if (this.getState() === AgentPageSubstate.Collapsed) {
        this.expand();
        void invoke("set_expanded", { expanded: true });
        window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
      } else {
        const agentArea = document.getElementById("agent-area");
        if (agentArea) agentArea.classList.add("collapsing");
        window.setTimeout(() => {
          this.collapse();
          void invoke("set_expanded", { expanded: false });
          window.setTimeout(() => {
            if (agentArea) agentArea.classList.remove("collapsing");
            setIsExpandAnimating(false);
          }, 50);
        }, 100);
      }
    });
  }
}

export const agentPageSubstateMachine = new AgentPageSubstateMachine();
