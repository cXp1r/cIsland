import { definePageSubstate, PageSubstateKind } from "./common";

export const SadbPageSubstate = {
  Collapsed: "collapsed",
  IdlePanel: "idle_panel",
  Mirroring: "mirroring",
} as const;

export type SadbPageSubstate = (typeof SadbPageSubstate)[keyof typeof SadbPageSubstate];

export const sadbPageSubstateDefinition = definePageSubstate<SadbPageSubstate>({
  kind: PageSubstateKind.Sadb,
  initialState: SadbPageSubstate.Collapsed,
  states: [SadbPageSubstate.Collapsed, SadbPageSubstate.IdlePanel, SadbPageSubstate.Mirroring],
});
