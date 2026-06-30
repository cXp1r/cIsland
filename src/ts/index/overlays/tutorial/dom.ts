import { $ } from "../../shared/dom";

export const tutorialArea = $<HTMLDivElement>("tutorial-area");

export function getTutorialCard(): HTMLElement | null {
  return tutorialArea.firstElementChild as HTMLElement | null;
}

export function getTutorialSkipButton(): HTMLButtonElement | null {
  return tutorialArea.querySelector(".tutorial-actions .oi-btn-secondary") as HTMLButtonElement | null;
}

export function getTutorialNextButton(): HTMLButtonElement | null {
  return tutorialArea.querySelector(".tutorial-actions .oi-btn-primary") as HTMLButtonElement | null;
}

export function getTutorialBodyMain(): HTMLDivElement | null {
  return tutorialArea.querySelector(".tutorial-body-main") as HTMLDivElement | null;
}
