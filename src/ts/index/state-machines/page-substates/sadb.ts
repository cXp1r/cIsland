import { definePageSubstate, PageSubstateKind } from "../page-substates";

export const SadbPageSubstate = {
  Collapsed: "collapsed",
  IdlePanel: "idle_panel", // 待机面板态
  Mirroring: "mirroring", // 镜像态
} as const;

export type SadbPageSubstate = (typeof SadbPageSubstate)[keyof typeof SadbPageSubstate];

export const sadbPageSubstateDefinition = definePageSubstate<SadbPageSubstate>({
  kind: PageSubstateKind.Sadb,
  initialState: SadbPageSubstate.Collapsed,
  states: [SadbPageSubstate.Collapsed, SadbPageSubstate.IdlePanel, SadbPageSubstate.Mirroring],
});
