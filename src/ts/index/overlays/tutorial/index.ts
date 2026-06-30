import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export {
  hideTutorial,
  initTutorialOverlay,
  showTutorial,
} from "./controller";
export type { TutorialAction, TutorialState, TutorialStep } from "./model";
export {
  playTutorialEnterAnimation,
  playTutorialExitAnimation,
  renderTutorialStep,
  resetTutorialRenderer,
} from "./renderer";

export const tutorialOverlayModule: OverlayRequest = {
  id: "tutorial",
  priority: OverlayPriority.Tutorial,
};
