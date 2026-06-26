import { listen } from "@tauri-apps/api/event";
import {
  lyricMeta,
  lyricTextInner,
  mpLyricText,
  mpProgressFill,
  mpProgressThumb,
  mpTimeCurrent,
  mpTimeTotal,
  musicPanelArtist,
  musicPanelCoverImg,
  musicPanelSong,
  progressFill,
  progressThumb,
  vinylCover,
} from "../../../doms/music";
import {
  setCurrentArtistName,
  setCurrentDurationMs,
  setCurrentSongTitle,
  setCurrentThumbnailUrl,
  setIsMusicPlaying,
  setIsSeekable,
} from "../../../utils/state";
import { formatTime } from "../../../utils/utils";
import { logi } from "../../../../utils/logger";
import { resetMpLyricFlipState } from "./lyric-renderer";

type MediaChangedPayload = {
  title: string;
  artist: string;
  album_title?: string;
  album_artist?: string;
  genre?: string;
  thumbnail?: string | null;
  duration_ms?: number;
  seekable?: boolean;
};

function updateCover(thumbnail?: string | null) {
  if (thumbnail) {
    logi("SMTC", `thumbnail received ${thumbnail.length} chars`);
    setCurrentThumbnailUrl(thumbnail);
    vinylCover.style.backgroundImage = `url(${thumbnail})`;
    musicPanelCoverImg.style.backgroundImage = `url(${thumbnail})`;
    return;
  }

  logi("SMTC", "thumbnail missing");
  setCurrentThumbnailUrl("");
  vinylCover.style.backgroundImage = "";
  musicPanelCoverImg.style.backgroundImage = "";
}

function resetProgress(durationMs?: number) {
  const safeDurationMs = durationMs && durationMs > 0 ? durationMs : 0;
  setCurrentDurationMs(safeDurationMs);
  progressFill.style.width = "0%";
  progressThumb.style.left = "0%";
  mpProgressFill.style.width = "0%";
  mpProgressThumb.style.left = "0%";
  mpTimeCurrent.textContent = "0:00";
  mpTimeTotal.textContent = safeDurationMs > 0 ? formatTime(safeDurationMs) : "0:00";
}

export function initMediaRenderer() {
  listen<MediaChangedPayload>("media-changed", (event) => {
    const { title, artist, genre, thumbnail, duration_ms, seekable } = event.payload;

    setIsMusicPlaying(true);
    setCurrentSongTitle(title);
    setCurrentArtistName(artist);
    setIsSeekable(seekable ?? true);

    logi("SMTC", `genre='${genre ?? ""}' title='${title}' artist='${artist}'`);

    lyricTextInner.textContent = "";
    lyricMeta.textContent = `${artist} - ${title}`;
    lyricMeta.style.fontSize = "";
    lyricMeta.style.color = "";
    mpLyricText.textContent = "";
    resetMpLyricFlipState();

    musicPanelSong.textContent = title;
    musicPanelArtist.textContent = artist;
    updateCover(thumbnail);
    resetProgress(duration_ms);
  });
}
