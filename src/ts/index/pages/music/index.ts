import { PageState } from "../types";
import type { PageModule } from "../types";
import { initMusicController } from "./controller";
import { initMusicRenderers } from "./renderer";

export const musicPageModule: PageModule = {
  id: PageState.Music,
  initController: initMusicController,
  initRenderer: initMusicRenderers,
};

export { initMusicController } from "./controller";
export { resetMpLyricFlipState } from "./lyric-renderer";
export { lyricPageSubstateMachine } from "./machine";
export { initMusicRenderers, musicList } from "./renderer";
