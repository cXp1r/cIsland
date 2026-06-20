import { definePageSubstate, PageSubstateKind } from "../page-substates";

export const EmailPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Dragging: "dragging", // 拖动窗口或内容
} as const;

export type EmailPageSubstate = (typeof EmailPageSubstate)[keyof typeof EmailPageSubstate];

export const emailPageSubstateDefinition = definePageSubstate<EmailPageSubstate>({
  kind: PageSubstateKind.Email,
  initialState: EmailPageSubstate.Collapsed,
  states: [EmailPageSubstate.Collapsed, EmailPageSubstate.Expanded, EmailPageSubstate.Dragging],
});
