import { definePageSubstate, PageSubstateKind } from "../page-substates";

export const TimePageSubstate = {
  Collapsed: "collapsed", // 通用收起态
  Expanded: "expanded", // 通用展开态
} as const;

export type TimePageSubstate = (typeof TimePageSubstate)[keyof typeof TimePageSubstate];

export const timePageSubstateDefinition = definePageSubstate<TimePageSubstate>({
  kind: PageSubstateKind.Time,
  initialState: TimePageSubstate.Collapsed,
  states: [TimePageSubstate.Collapsed, TimePageSubstate.Expanded],
});
