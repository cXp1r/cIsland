import { definePageSubstate, PageSubstateKind } from "../page-substates";

export const AgentPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Thinking: "thinking", // 思考阶段
  Generating: "generating", // 回复生成阶段
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
