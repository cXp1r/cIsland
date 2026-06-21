import { PageState } from "../page";
import { invoke } from "@tauri-apps/api/core";
import { PageSubstateMachine, debouncedAction, type PageSubstateAction } from "./common";
import {
  currentArtistName,
  currentSongTitle,
  currentThumbnailUrl,
  isExpandAnimating,
  musicClickTimer,
  setIsExpandAnimating,
  setMusicClickTimer,
} from "../../state";
import { fetchAndUpdateVolume } from "../../modules/music-controls";
import { musicPanelArtist, musicPanelCoverImg, musicPanelSong, vinylCover } from "../../dom";

export const LyricPageSubstate = {
  Collapsed: "collapsed",
  Expanded: "expanded",
  Seeking: "seeking",
} as const;

export type LyricPageSubstate = (typeof LyricPageSubstate)[keyof typeof LyricPageSubstate];

export class LyricPageSubstateMachine extends PageSubstateMachine<LyricPageSubstate> {
  constructor() {
    super(PageState.Lyric, LyricPageSubstate.Collapsed);
  }

  expand(): void {
    this.dispatch(LyricPageSubstate.Expanded);
  }

  collapse(): void {
    this.dispatch(LyricPageSubstate.Collapsed);
  }

  seeking(): void {
    this.dispatch(LyricPageSubstate.Seeking);
  }

  protected override handleAction(action: PageSubstateAction): void {
    if (action.type !== "click") return;
    const { target, event } = action;
    if (this.getState() === "expanded") {
      if (!target.closest("#music-panel-header")) return;
    } else if (
      target.closest(".media-btn")
      || target.closest(".progress-bar")
      || target.closest(".vol-btn")
    ) {
      return;
    }

    event.stopPropagation();
    debouncedAction(musicClickTimer, setMusicClickTimer, () => {
      if (isExpandAnimating) return;
      setIsExpandAnimating(true);

      if (this.getState() !== "expanded") {
        musicPanelSong.textContent = currentSongTitle || "";
        musicPanelArtist.textContent = currentArtistName || "";
        if (currentThumbnailUrl) {
          vinylCover.style.backgroundImage = `url(${currentThumbnailUrl})`;
          musicPanelCoverImg.style.backgroundImage = `url(${currentThumbnailUrl})`;
        }
        fetchAndUpdateVolume();
        this.expand();
        void invoke("set_expanded", { expanded: true });
        window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
      } else {
        this.collapse();
        void invoke("set_expanded", { expanded: false });
        window.setTimeout(() => { setIsExpandAnimating(false); }, 500);
      }
    });
  }
}

export const lyricPageSubstateMachine = new LyricPageSubstateMachine();
