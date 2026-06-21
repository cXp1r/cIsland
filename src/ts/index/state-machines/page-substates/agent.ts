import { definePageSubstate, PageSubstateKind } from "./common";

export const AgentPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Thinking: "thinking",
  Generating: "generating",
} as const;

export type AgentPageSubstate = (typeof AgentPageSubstate)[keyof typeof AgentPageSubstate];

export const agentPageSubstateDefinition = definePageSubstate<AgentPageSubstate>({
  kind: PageSubstateKind.Agent,
  initialState: AgentPageSubstate.Collapsed,
  states: [
    AgentPageSubstate.Collapsed,
    AgentPageSubstate.Expanded,
    AgentPageSubstate.Thinking,
    AgentPageSubstate.Generating,
  ],
});
