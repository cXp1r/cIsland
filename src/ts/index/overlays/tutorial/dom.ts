import { $ } from "../../shared/dom";

export const tutorialArea = $<HTMLDivElement>("tutorial-area");

export function getTutorialCard(): HTMLElement | null {
  return tutorialArea.firstElementChild as HTMLElement | null;
}

export function getTutorialSkipButton(): HTMLButtonElement | null {
  return tutorialArea.querySelector(".tutorial-actions .oi-btn-secondary") as HTMLButtonElement | null;
}

export function getTutorialNextButton(): HTMLButtonElement | null {
  return tutorialArea.querySelector('[data-tutorial-action="next"]') as HTMLButtonElement | null;
}

export function getTutorialPrevButton(): HTMLButtonElement | null {
  return tutorialArea.querySelector('[data-tutorial-action="back"]') as HTMLButtonElement | null;
}

export function getTutorialBodyMain(): HTMLDivElement | null {
  return tutorialArea.querySelector(".tutorial-body-main") as HTMLDivElement | null;
}

export function getTutorialPanes(): HTMLDivElement[] {
  return Array.from(tutorialArea.querySelectorAll<HTMLDivElement>(".tutorial-step-pane"));
}

export function getTutorialPane(stepIndex: number): HTMLDivElement | null {
  return document.getElementById(String(stepIndex + 1)) as HTMLDivElement | null;
}

export function getTutorialStepPanes(): HTMLDivElement[] {
  return getTutorialPanes();
}

export function getTutorialDots(): HTMLButtonElement[] {
  return Array.from(tutorialArea.querySelectorAll<HTMLButtonElement>(".tutorial-dot"));
}

export function getTutorialTitle(): HTMLDivElement | null {
  return tutorialArea.querySelector(".tutorial-title") as HTMLDivElement | null;
}

export function getTutorialSubtitle(): HTMLDivElement | null {
  return tutorialArea.querySelector(".tutorial-subtitle") as HTMLDivElement | null;
}

export function getTutorialStepLabel(): HTMLDivElement | null {
  return tutorialArea.querySelector(".tutorial-step") as HTMLDivElement | null;
}

export function getTutorialActions(): HTMLDivElement | null {
  return tutorialArea.querySelector(".tutorial-actions") as HTMLDivElement | null;
}
