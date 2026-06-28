import { PageState } from "../types";
import type { PageModule } from "../types";
import { initMusicRenderers } from "./renderer";

export const musicPageModule: PageModule = {
  id: PageState.Music,
  initRenderer: initMusicRenderers,
};

export { resetMpLyricFlipState } from "./lyric-renderer";
export { lyricPageSubstateMachine } from "./machine";
export { initMusicRenderers, musicList } from "./renderer";
