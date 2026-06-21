import { definePageSubstate, PageSubstateKind } from "./common";

export const DownloaderPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Downloading: "downloading",
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
