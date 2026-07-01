import type { TutorialStep } from "./model";
import { tutorialArea, tutorialGsapSlot, tutorialStepLabel, tutorialText, tutorialTitle } from "./dom";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function renderTutorialStep(step: TutorialStep): void {
  if (tutorialStepLabel) tutorialStepLabel.textContent = step.stepLabel;
  if (tutorialTitle) tutorialTitle.innerHTML = escapeHtml(step.title);
  if (tutorialText) tutorialText.textContent = step.text;
  if (tutorialGsapSlot) tutorialGsapSlot.textContent = `GSAP 动画 / Step ${step.stepIndex + 1}`;
}

export function resetTutorialRenderer(): void {
  // Intentionally left blank for the tutorial shell.
}

export function playTutorialEnterAnimation(): void {
  // GSAP placeholder:
  // gsap.fromTo(tutorialArea, { autoAlpha: 0, y: 10, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "power3.out" });
  void tutorialArea;
}

export function playTutorialExitAnimation(): void {
  // GSAP placeholder:
  // gsap.to(tutorialArea, { autoAlpha: 0, y: 8, scale: 0.99, duration: 0.18, ease: "power2.in" });
  void tutorialArea;
}
