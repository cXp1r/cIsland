import type { PageRenderSpec } from "../types";
import { initLyricRenderer } from "./lyric-renderer";
import { initMediaRenderer } from "./media-renderer";

export function initMusicRenderers(): void {
  initMediaRenderer();
  initLyricRenderer();
}

export const musicList: Record<string, PageRenderSpec> = {
  collapsed: {
    classList: ["lyric-collapsed"],
    size: [380, 50],
  },
  expanded: {
    classList: ["expanded"],
    size: [380, 420],
  },
};

