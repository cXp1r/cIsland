import { animateCapsule } from "../../utils/rAF";
import { capsule } from "../../shell/dom";
import { overlayManager } from "../manager";
import { OverlayPriority } from "../priority";
import {
  tutorialActions,
  tutorialGsapSlot,
  tutorialNextButton,
  tutorialPrevButton,
  tutorialSkipButton,
  tutorialStepLabel,
  tutorialText,
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
const TUTORIAL_STEP_COUNT = 4;


const LABEL_NEXT = "下一步";
const LABEL_DONE = "完成";
const LABEL_GSAP = "动画";

const TUTORIAL_STEP_TEXTS = [
  "\u8fd9\u91cc\u5148\u653e\u7b2c\u4e00\u6b65\u7684\u6587\u6848\u3002\u540e\u9762\u53ef\u4ee5\u6362\u6210\u771f\u6b63\u7684\u64cd\u4f5c\u63d0\u793a\u3001\u5173\u952e\u8bf4\u660e\uff0c\u6216\u8005\u4e00\u6b65\u4e00\u6b65\u7684\u5f15\u5bfc\u8bed\u8a00\u3002",
  "\u8fd9\u91cc\u5148\u653e\u7b2c\u4e8c\u6b65\u7684\u6587\u6848\u3002\u7b49\u6211\u4eec\u63a5\u5165\u771f\u6b63\u5185\u5bb9\u540e\uff0c\u8fd9\u4e00\u5757\u4f1a\u4f5c\u4e3a\u5de6\u4e0b\u89d2\u7684\u8bf4\u660e\u533a\u3002",
  "\u8fd9\u91cc\u5148\u653e\u7b2c\u4e09\u6b65\u7684\u6587\u6848\u3002\u53ef\u4ee5\u7528\u6765\u89e3\u91ca\u5f53\u524d\u6b65\u9aa4\u3001\u8865\u5145\u6ce8\u610f\u4e8b\u9879\uff0c\u6216\u8005\u5c55\u793a\u64cd\u4f5c\u7ed3\u679c\u3002",
  "\u8fd9\u91cc\u5148\u653e\u7b2c\u56db\u6b65\u7684\u6587\u6848\u3002\u6700\u540e\u4e00\u5c4f\u53ef\u4ee5\u7528\u6765\u505a\u603b\u7ed3\u3001\u6536\u5c3e\uff0c\u6216\u8005\u5f15\u5bfc\u7528\u6237\u5b8c\u6210\u4e0b\u4e00\u6b65\u3002",
];

const buttonWrap = document.createElement("div");
  buttonWrap.className = "tutorial-action-buttons";

let isVisible = false;
let currentStepIndex = 0;

function dispatchAction(action: TutorialAction): void {
  document.dispatchEvent(new CustomEvent("tutorial-action", {
    detail: { action },
  }));
}

function handleTutorialWheel(event: WheelEvent): void {
  event.preventDefault();
  event.stopPropagation();

  if (event.deltaY > 0 || (event.deltaY === 0 && event.deltaX > 0)) {
    setTutorialStep(currentStepIndex + 1);
    return;
  }

  if (event.deltaY < 0 || (event.deltaY === 0 && event.deltaX < 0)) {
    setTutorialStep(currentStepIndex - 1);
  }
}

function buildTutorialLayout(): void {


  const dots = document.createElement("div");
  dots.className = "tutorial-dots";

  for (let i = 0; i < TUTORIAL_STEP_COUNT; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "tutorial-dot";
    dot.dataset.step = String(i);
    dot.setAttribute("aria-label", `Step ${i + 1}`);
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      setTutorialStep(i);
    });
    dots.appendChild(dot);
  }

  
  buttonWrap.append(tutorialSkipButton, tutorialPrevButton, tutorialNextButton);

  tutorialActions.replaceChildren(dots, buttonWrap);
  tutorialActions.addEventListener("wheel", handleTutorialWheel, { passive: false });
}

function updateTutorialStepDisplay(): void {
  const dots = Array.from(tutorialArea.querySelectorAll<HTMLButtonElement>(".tutorial-dot"));

  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentStepIndex);
  });

  if (tutorialStepLabel) {
    tutorialStepLabel.textContent = `Step ${String(currentStepIndex + 1).padStart(2, "0")} / ${String(TUTORIAL_STEP_COUNT).padStart(2, "0")}`;
  }

  if (tutorialPrevButton) {
    tutorialPrevButton.disabled = currentStepIndex === 0;
  }

  if (tutorialNextButton) {
    tutorialNextButton.textContent = currentStepIndex === TUTORIAL_STEP_COUNT - 1 ? LABEL_DONE : LABEL_NEXT;
  }

  if (tutorialText) {
    tutorialText.textContent = TUTORIAL_STEP_TEXTS[currentStepIndex];
  }

  if (tutorialGsapSlot) {
    tutorialGsapSlot.textContent = `${LABEL_GSAP} / Step ${currentStepIndex + 1}`;
  }
}

export function setTutorialStep(nextIndex: number): void {
  const clamped = Math.max(0, Math.min(TUTORIAL_STEP_COUNT - 1, nextIndex));
  currentStepIndex = clamped;
  updateTutorialStepDisplay();
}

function finishTutorial(): void {
  dispatchAction("finish");
  hideTutorial();
}

export function showTutorial(): boolean {
  if (!overlayManager.request("tutorial", TUTORIAL_PRIORITY)) {
    return false;
  }

  isVisible = true;
  buildTutorialLayout();
  capsule.classList.add("tutorial-active");
  tutorialArea.classList.add("active");
  animateCapsule(TUTORIAL_CAPSULE_WIDTH, TUTORIAL_CAPSULE_HEIGHT);
  setTutorialStep(0);
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
  buildTutorialLayout();
  resetTutorialRenderer();

  tutorialSkipButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    dispatchAction("skip");
    hideTutorial();
  });

  tutorialNextButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (currentStepIndex >= TUTORIAL_STEP_COUNT - 1) {
      finishTutorial();
      return;
    }
    dispatchAction("next");
    setTutorialStep(currentStepIndex + 1);
  });

  tutorialPrevButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    dispatchAction("back");
    setTutorialStep(currentStepIndex - 1);
  });

  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (e.detail.state === "tutorial") return;
    if (isVisible) {
      hideTutorial();
    }
  }) as EventListener);
}
