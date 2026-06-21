import { definePageSubstate, PageSubstateKind } from "./common";

export const LyricPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Seeking: "seeking",
} as const;

export type LyricPageSubstate = (typeof LyricPageSubstate)[keyof typeof LyricPageSubstate];

export const lyricPageSubstateDefinition = definePageSubstate<LyricPageSubstate>({
  kind: PageSubstateKind.Lyric,
  initialState: LyricPageSubstate.Collapsed,
  states: [LyricPageSubstate.Collapsed, LyricPageSubstate.Expanded, LyricPageSubstate.Seeking],
});
