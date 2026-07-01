import type { TutorialStep } from "./model";
import { getTutorialBodyMain, getTutorialCard, getTutorialStepLabel, getTutorialSubtitle, getTutorialTitle, tutorialArea } from "./dom";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function renderTutorialStep(step: TutorialStep): void {
  const card = getTutorialCard();
  if (!card) return;

  const titleEl = getTutorialTitle();
  const subtitleEl = getTutorialSubtitle();
  const stepEl = getTutorialStepLabel();
  const bodyMain = getTutorialBodyMain();

  if (stepEl) stepEl.textContent = step.stepLabel;
  if (titleEl) titleEl.innerHTML = escapeHtml(step.title);
  if (subtitleEl) subtitleEl.innerHTML = escapeHtml(step.subtitle);
  if (bodyMain) {
    bodyMain.innerHTML = step.bodyHtml;
  }
}

export function resetTutorialRenderer(): void {
  // Intentionally no-op for now.
  // The tutorial shell stays authored in index.html until we swap in data-driven steps.
}

export function playTutorialEnterAnimation(): void {
  // GSAP placeholder:
  // import { gsap } from "gsap";
  // gsap.fromTo(tutorialArea, { autoAlpha: 0, y: 10, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "power3.out" });
  void tutorialArea;
}

export function playTutorialExitAnimation(): void {
  // GSAP placeholder:
  // gsap.to(tutorialArea, { autoAlpha: 0, y: 8, scale: 0.99, duration: 0.18, ease: "power2.in" });
  void tutorialArea;
}
