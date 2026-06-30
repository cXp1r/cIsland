import { animateCapsule } from "../../utils/rAF";
import { capsule } from "../../shell/dom";
import { overlayManager } from "../manager";
import { OverlayPriority } from "../priority";
import {
  getTutorialNextButton,
  getTutorialSkipButton,
  tutorialArea,
} from "./dom";
import {
  playTutorialEnterAnimation,
  playTutorialExitAnimation,
  resetTutorialRenderer,
} from "./renderer";
import type { TutorialAction } from "./model";

const TUTORIAL_CAPSULE_WIDTH = 760;
const TUTORIAL_CAPSULE_HEIGHT = 430;
const TUTORIAL_PRIORITY = OverlayPriority.Tutorial;
const CLEAR_CAPSULE_CLASSES = [
  "search-active",
  "search-expanded",
  "notice-active",
  "agent-handler-active",
  "privacy-active",
  "expanded",
  "music-expanded",
  "agent-expanded",
  "email-expanded",
  "downloader-expanded",
  "sadb-expanded",
];

let isVisible = false;

function clearConflictingOverlayState(): void {
  capsule.classList.remove(...CLEAR_CAPSULE_CLASSES);
  tutorialArea.classList.remove("active");
  document.querySelector("#notice-area")?.classList.remove("active");
  document.querySelector("#agent-handler")?.classList.remove("active");
  document.querySelector("#privacy-indicators")?.classList.remove("active");
}

function dispatchAction(action: TutorialAction): void {
  document.dispatchEvent(new CustomEvent("tutorial-action", {
    detail: { action },
  }));
}

export function showTutorial(): boolean {
  if (!overlayManager.request("tutorial", TUTORIAL_PRIORITY)) {
    return false;
  }

  isVisible = true;
  clearConflictingOverlayState();
  capsule.classList.add("tutorial-active");
  tutorialArea.classList.add("active");
  animateCapsule(TUTORIAL_CAPSULE_WIDTH, TUTORIAL_CAPSULE_HEIGHT);
  playTutorialEnterAnimation();
  return true;
}

export function hideTutorial(): void {
  if (!isVisible) return;

  isVisible = false;
  playTutorialExitAnimation();
  tutorialArea.classList.remove("active");
  capsule.classList.remove("tutorial-active");
  overlayManager.release("tutorial");
  resetTutorialRenderer();
}

export function initTutorialOverlay(): void {
  resetTutorialRenderer();

  getTutorialSkipButton()?.addEventListener("click", (event) => {
    event.stopPropagation();
    dispatchAction("skip");
    hideTutorial();
  });

  getTutorialNextButton()?.addEventListener("click", (event) => {
    event.stopPropagation();
    dispatchAction("next");
  });

  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (e.detail.state === "tutorial") return;
    if (isVisible) {
      hideTutorial();
    }
  }) as EventListener);
}
