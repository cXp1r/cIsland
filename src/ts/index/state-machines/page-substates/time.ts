import { definePageSubstate, PageSubstateKind } from "./common";

export const TimePageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
} as const;

export type TimePageSubstate = (typeof TimePageSubstate)[keyof typeof TimePageSubstate];

export const timePageSubstateDefinition = definePageSubstate<TimePageSubstate>({
  kind: PageSubstateKind.Time,
  initialState: TimePageSubstate.Collapsed,
  states: [TimePageSubstate.Collapsed, TimePageSubstate.Expanded],
});
