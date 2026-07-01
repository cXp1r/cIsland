import { $ } from "../../shared/dom";

export const tutorialArea = $<HTMLDivElement>("tutorial-area");

export const getTutorialCard = (): HTMLElement | null => $("tutorial-card");

export const getTutorialSkipButton = (): HTMLButtonElement | null => $("tutorial-skip-button");

export const getTutorialNextButton = (): HTMLButtonElement | null => $("tutorial-next-button");

export const getTutorialPrevButton = (): HTMLButtonElement | null => $("tutorial-prev-button");

export const getTutorialBodyMain = (): HTMLDivElement | null => $("tutorial-body-main");

export const getTutorialPanes = (): HTMLDivElement[] =>
  Array.from(tutorialArea.querySelectorAll<HTMLDivElement>(".tutorial-step-pane"));

export const getTutorialPane = (stepIndex: number): HTMLDivElement | null =>
  document.getElementById(String(stepIndex + 1)) as HTMLDivElement | null;

export const getTutorialStepPanes = (): HTMLDivElement[] => getTutorialPanes();

export const getTutorialDots = (): HTMLButtonElement[] =>
  Array.from(tutorialArea.querySelectorAll<HTMLButtonElement>(".tutorial-dot"));

export const getTutorialTitle = (): HTMLDivElement | null => $("tutorial-title");

export const getTutorialSubtitle = (): HTMLDivElement | null => $("tutorial-subtitle");

export const getTutorialStepLabel = (): HTMLDivElement | null => $("tutorial-step");

export const getTutorialActions = (): HTMLDivElement | null => $("tutorial-actions");
