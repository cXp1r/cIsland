import { invoke } from "@tauri-apps/api/core";
import {
  btnNext,
  btnPlay,
  btnPrev,
  mpNext,
  mpPlay,
  mpPrev,
  mpProgressBar,
  mpProgressFill,
  mpProgressThumb,
  mpTimeCurrent,
  mpVolumeBar,
  mpVolumeFill,
  mpVolumeThumb,
  progressBar,
  progressFill,
  progressThumb,
} from "./dom";
import {
  currentDurationMs,
  isSeekable,
  setIsSeekable,
} from "./state";
import { formatTime } from "../../utils/utils";
import { logw } from "../../shared/logger";

let isProgressSeeking = false;
let isMpProgressSeeking = false;
let isMpVolumeSeeking = false;
let volumeThrottleTimer: number | null = null;
let isInitialized = false;

function clampPct(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getBarPct(bar: HTMLElement, clientX: number): number {
  const rect = bar.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  return clampPct((clientX - rect.left) / rect.width);
}

function updateProgressFromMouse(e: MouseEvent): number {
  const pct = getBarPct(progressBar, e.clientX);
  progressFill.style.width = `${pct * 100}%`;
  progressThumb.style.left = `${pct * 100}%`;
  return pct;
}

function updateMpProgressFromMouse(e: MouseEvent): number {
  const pct = getBarPct(mpProgressBar, e.clientX);
  mpProgressFill.style.width = `${pct * 100}%`;
  mpProgressThumb.style.left = `${pct * 100}%`;
  mpTimeCurrent.textContent = formatTime(pct * currentDurationMs);
  return pct;
}

function updateMpVolumeFromMouse(e: MouseEvent): number {
  const pct = getBarPct(mpVolumeBar, e.clientX);
  mpVolumeFill.style.width = `${pct * 100}%`;
  mpVolumeThumb.style.left = `${pct * 100}%`;
  return pct;
}

export function updateSeekable(seekable: boolean): void {
  if (isSeekable === seekable) return;
  setIsSeekable(seekable);
  progressBar.classList.toggle("no-seek", !seekable);
  mpProgressBar.classList.toggle("no-seek", !seekable);
}

function bindTransportButtons(): void {
  const bind = (button: HTMLButtonElement, command: string): void => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      void invoke(command);
    });
  };

  bind(btnPrev, "media_prev");
  bind(btnPlay, "media_play_pause");
  bind(btnNext, "media_next");
  bind(mpPrev, "media_prev");
  bind(mpPlay, "media_play_pause");
  bind(mpNext, "media_next");
}

function bindProgressBars(): void {
  progressBar.addEventListener("mousedown", (e: MouseEvent) => {
    if (currentDurationMs <= 0 || !isSeekable) return;
    e.stopPropagation();
    isProgressSeeking = true;
    progressBar.classList.add("seeking");
    updateProgressFromMouse(e);
  });

  mpProgressBar.addEventListener("mousedown", (e: MouseEvent) => {
    if (currentDurationMs <= 0 || !isSeekable) return;
    e.stopPropagation();
    isMpProgressSeeking = true;
    mpProgressBar.classList.add("seeking");
    updateMpProgressFromMouse(e);
  });

  mpVolumeBar.addEventListener("mousedown", (e: MouseEvent) => {
    e.stopPropagation();
    isMpVolumeSeeking = true;
    mpVolumeBar.classList.add("seeking");
    const pct = updateMpVolumeFromMouse(e);
    void invoke("media_set_volume", { volume: pct }).catch(() => {});
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (isProgressSeeking) {
      updateProgressFromMouse(e);
    }
    if (isMpProgressSeeking) {
      updateMpProgressFromMouse(e);
    }
    if (isMpVolumeSeeking) {
      const pct = updateMpVolumeFromMouse(e);
      if (volumeThrottleTimer === null) {
        volumeThrottleTimer = window.setTimeout(() => {
          volumeThrottleTimer = null;
        }, 50);
        void invoke("media_set_volume", { volume: pct }).catch(() => {});
      }
    }
  });

  document.addEventListener("mouseup", (e: MouseEvent) => {
    if (isProgressSeeking) {
      isProgressSeeking = false;
      progressBar.classList.remove("seeking");
      const pct = updateProgressFromMouse(e);
      const seekMs = Math.round(pct * currentDurationMs);
      void invoke("media_seek", { positionMs: seekMs }).catch((err: unknown) => {
        logw("MusicController", "Seek failed:", err);
      });
    }

    if (isMpProgressSeeking) {
      isMpProgressSeeking = false;
      mpProgressBar.classList.remove("seeking");
      const pct = updateMpProgressFromMouse(e);
      const seekMs = Math.round(pct * currentDurationMs);
      void invoke("media_seek", { positionMs: seekMs }).catch((err: unknown) => {
        logw("MusicController", "Seek failed:", err);
      });
    }

    if (isMpVolumeSeeking) {
      isMpVolumeSeeking = false;
      mpVolumeBar.classList.remove("seeking");
      const pct = updateMpVolumeFromMouse(e);
      void invoke("media_set_volume", { volume: pct }).catch((err: unknown) => {
        logw("MusicController", "Set volume failed:", err);
      });
    }
  });
}

export function initMusicController(): void {
  if (isInitialized) return;
  isInitialized = true;
  bindTransportButtons();
  bindProgressBars();
}
