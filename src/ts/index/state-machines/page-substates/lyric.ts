import { definePageSubstate, PageSubstateKind } from "../page-substates";

export const LyricPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Seeking: "seeking", // 拖动或调整进度
} as const;

export type LyricPageSubstate = (typeof LyricPageSubstate)[keyof typeof LyricPageSubstate];

export const lyricPageSubstateDefinition = definePageSubstate<LyricPageSubstate>({
  kind: PageSubstateKind.Lyric,
  initialState: LyricPageSubstate.Collapsed,
  states: [LyricPageSubstate.Collapsed, LyricPageSubstate.Expanded, LyricPageSubstate.Seeking],
});
