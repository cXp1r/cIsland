import {
  iconPause,
  iconPlay,
  mpProgressFill,
  mpProgressThumb,
  mpTimeCurrent,
  mpIconPause,
  mpIconPlay,
  progressFill,
  progressThumb,
  vinylDisc,
} from "./dom";
import {
  activeLyricBasePerfMs,
  activeLyricBasePositionMs,
  currentDurationMs,
  isPlaying,
} from "./state";
import { formatTime } from "../../utils/utils";

let progressRafId: number | null = null;

export function updatePlayIcon(): void {
  iconPlay.style.display = isPlaying ? "none" : "block";
  iconPause.style.display = isPlaying ? "block" : "none";
  mpIconPlay.style.display = isPlaying ? "none" : "block";
  mpIconPause.style.display = isPlaying ? "block" : "none";

  if (isPlaying) {
    vinylDisc.classList.remove("paused");
  } else {
    vinylDisc.classList.add("paused");
  }
}

function renderProgress(positionMs: number): void {
  if (currentDurationMs <= 0) {
    progressFill.style.width = "0%";
    progressThumb.style.left = "0%";
    mpProgressFill.style.width = "0%";
    mpProgressThumb.style.left = "0%";
    mpTimeCurrent.textContent = "0:00";
    return;
  }

  const pct = Math.min(1, Math.max(0, positionMs / currentDurationMs));
  progressFill.style.width = `${pct * 100}%`;
  progressThumb.style.left = `${pct * 100}%`;
  mpProgressFill.style.width = `${pct * 100}%`;
  mpProgressThumb.style.left = `${pct * 100}%`;
  mpTimeCurrent.textContent = formatTime(Math.min(positionMs, currentDurationMs));
}

function tickProgress(now: number): void {
  progressRafId = null;
  if (!isPlaying) return;

  const positionMs = activeLyricBasePositionMs + Math.max(0, now - activeLyricBasePerfMs);
  renderProgress(positionMs);
  progressRafId = window.requestAnimationFrame(tickProgress);
}

export function syncProgressUI(): void {
  if (progressRafId !== null) return;

  if (!isPlaying) {
    renderProgress(activeLyricBasePositionMs);
    return;
  }

  progressRafId = window.requestAnimationFrame(tickProgress);
}
