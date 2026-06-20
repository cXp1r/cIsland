import { definePageSubstate, PageSubstateKind } from "../page-substates";

export const DownloaderPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Downloading: "downloading", // 正在执行下载任务
} as const;

export type DownloaderPageSubstate =
  (typeof DownloaderPageSubstate)[keyof typeof DownloaderPageSubstate];

export const downloaderPageSubstateDefinition = definePageSubstate<DownloaderPageSubstate>({
  kind: PageSubstateKind.Downloader,
  initialState: DownloaderPageSubstate.Collapsed,
  states: [
    DownloaderPageSubstate.Collapsed,
    DownloaderPageSubstate.Expanded,
    DownloaderPageSubstate.Downloading,
  ],
});
