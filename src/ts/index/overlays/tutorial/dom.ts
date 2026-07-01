import { $ } from "../../shared/dom";

export const tutorialArea = $<HTMLDivElement>("tutorial-area");

export const tutorialCard = $<HTMLElement>("tutorial-card");

export const tutorialSkipButton = $<HTMLButtonElement>("tutorial-skip-button");

export const tutorialNextButton = $<HTMLButtonElement>("tutorial-next-button");

export const tutorialPrevButton = $<HTMLButtonElement>("tutorial-prev-button");

export const tutorialBodyMain = $<HTMLDivElement>("tutorial-body-main");

export const getTutorialPanes = (): HTMLDivElement[] =>
  Array.from(tutorialArea.querySelectorAll<HTMLDivElement>(".tutorial-step-pane"));

export const getTutorialPane = (stepIndex: number): HTMLDivElement | null =>
  document.getElementById(String(stepIndex + 1)) as HTMLDivElement | null;

export const getTutorialStepPanes = (): HTMLDivElement[] => getTutorialPanes();

export const getTutorialDots = (): HTMLButtonElement[] =>
  Array.from(tutorialArea.querySelectorAll<HTMLButtonElement>(".tutorial-dot"));

export const tutorialTitle = $<HTMLDivElement>("tutorial-title");

export const tutorialSubtitle = $<HTMLDivElement>("tutorial-subtitle");

export const tutorialStepLabel = $<HTMLDivElement>("tutorial-step");

export const tutorialActions = $<HTMLDivElement>("tutorial-actions");
