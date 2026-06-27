import { sc } from "..";
import { initLyricRenderer } from "./lyric-renderer";
import { initMediaRenderer } from "./media-renderer";

export function initMusic() {
  initMediaRenderer();
  initLyricRenderer();
}

export const musicList: Record<string, sc> = {
  "collapsed": {
    classList: ["lyric-collapsed"],
    size: [380, 50],
  },
  "expanded": {
    classList: ["expanded"],
    size: [380, 420],
  },
};
