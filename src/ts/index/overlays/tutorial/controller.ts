import { animateCapsule } from "../../utils/rAF";
import { capsule } from "../../shell/dom";
import { overlayManager } from "../manager";
import { OverlayPriority } from "../priority";
import {
  getTutorialActions,
  getTutorialBodyMain,
  getTutorialDots,
  getTutorialNextButton,
  getTutorialPanes,
  getTutorialPrevButton,
  getTutorialSkipButton,
  getTutorialStepLabel,
  getTutorialSubtitle,
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

type TutorialStepTemplate = {
  title: string;
  body: string;
};

const TUTORIAL_STEP_TEMPLATES: TutorialStepTemplate[] = [
  {
    title: "认识入口",
    body: "这里先放第一步的占位内容。后面我们可以替换成真实说明、图文提示，或者一步一步的操作引导。",
  },
  {
    title: "确认区域",
    body: "这里先放第二步的占位内容。每一步都可以单独显示，因此后面加高亮和动效会比较方便。",
  },
  {
    title: "执行操作",
    body: "这里先放第三步的占位内容。你可以把关键动作、快捷键提示或者交互反馈直接塞进这一块。",
  },
  {
    title: "完成收尾",
    body: "这里先放第四步的占位内容。最后一步通常会放总结、跳转，或者收尾提示。",
  },
];

let isVisible = false;
let currentStepIndex = 0;
let hasBuiltLayout = false;

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

function createButton(label: string, action: TutorialAction): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = action === "skip" ? "oi-btn oi-btn-secondary" : "oi-btn oi-btn-primary";
  button.dataset.tutorialAction = action;
  button.textContent = label;
  return button;
}

function handleTutorialWheel(event: WheelEvent): void {
  event.preventDefault();
  event.stopPropagation();

  if (event.deltaY > 0 || (event.deltaY === 0 && event.deltaX > 0)) {
    nextTutorialStep();
    return;
  }

  if (event.deltaY < 0 || (event.deltaY === 0 && event.deltaX < 0)) {
    prevTutorialStep();
  }
}

function buildTutorialLayout(): void {
  if (hasBuiltLayout) return;

  const bodyMain = getTutorialBodyMain();
  const actions = getTutorialActions();
  if (!bodyMain || !actions) return;

  const subtitle = getTutorialSubtitle();
  const stepLabel = getTutorialStepLabel();

  if (subtitle) subtitle.textContent = "这里先放正文占位，后面可以替换成更完整的教程内容。";
  if (stepLabel) {
    stepLabel.textContent = `Step 01 / ${String(TUTORIAL_STEP_COUNT).padStart(2, "0")}`;
  }

  bodyMain.replaceChildren();
  for (let i = 0; i < TUTORIAL_STEP_COUNT; i++) {
    const template = TUTORIAL_STEP_TEMPLATES[i];
    const pane = document.createElement("div");
    pane.id = String(i + 1);
    pane.className = "tutorial-step-pane";
    pane.dataset.stepIndex = String(i);
    pane.innerHTML = `
      <div class="tutorial-step-pane-title">${template.title}</div>
      <div class="tutorial-step-pane-text">${template.body}</div>
    `;
    bodyMain.appendChild(pane);
  }

  const dots = document.createElement("div");
  dots.className = "tutorial-dots";
  dots.setAttribute("aria-label", "教程步骤");

  for (let i = 0; i < TUTORIAL_STEP_COUNT; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "tutorial-dot";
    dot.dataset.step = String(i);
    dot.setAttribute("aria-label", `第 ${i + 1} 步`);
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      setTutorialStep(i);
    });
    dots.appendChild(dot);
  }

  const buttonWrap = document.createElement("div");
  buttonWrap.className = "tutorial-action-buttons";

  const skipButton = createButton("跳过", "skip");
  const prevButton = createButton("上一步", "back");
  const nextButton = createButton("下一步", "next");

  buttonWrap.append(skipButton, prevButton, nextButton);
  actions.replaceChildren(dots, buttonWrap);
  actions.addEventListener("wheel", handleTutorialWheel, { passive: false });

  hasBuiltLayout = true;
}

function updateTutorialStepDisplay(): void {
  const panes = getTutorialPanes();
  const dots = getTutorialDots();
  const stepLabel = getTutorialStepLabel();
  const prevButton = getTutorialPrevButton();
  const nextButton = getTutorialNextButton();

  panes.forEach((pane: HTMLDivElement, index: number) => {
    const active = index === currentStepIndex;
    pane.classList.toggle("active", active);
    pane.style.display = active ? "flex" : "none";
  });

  dots.forEach((dot: HTMLButtonElement, index: number) => {
    dot.classList.toggle("active", index === currentStepIndex);
  });

  if (stepLabel) {
    stepLabel.textContent = `Step ${String(currentStepIndex + 1).padStart(2, "0")} / ${String(TUTORIAL_STEP_COUNT).padStart(2, "0")}`;
  }

  if (prevButton) {
    prevButton.disabled = currentStepIndex === 0;
  }

  if (nextButton) {
    nextButton.textContent = currentStepIndex === TUTORIAL_STEP_COUNT - 1 ? "完成" : "下一步";
  }

  // GSAP placeholder:
  // const activePane = panes[currentStepIndex];
  // gsap.fromTo(activePane, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.24, ease: "power3.out" });
}

export function setTutorialStep(nextIndex: number): void {
  const clamped = Math.max(0, Math.min(TUTORIAL_STEP_COUNT - 1, nextIndex));
  currentStepIndex = clamped;
  updateTutorialStepDisplay();
}

function nextTutorialStep(): void {
  setTutorialStep(currentStepIndex + 1);
}

function prevTutorialStep(): void {
  setTutorialStep(currentStepIndex - 1);
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
  clearConflictingOverlayState();
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

  getTutorialSkipButton()?.addEventListener("click", (event) => {
    event.stopPropagation();
    dispatchAction("skip");
    hideTutorial();
  });

  getTutorialNextButton()?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (currentStepIndex >= TUTORIAL_STEP_COUNT - 1) {
      finishTutorial();
      return;
    }
    dispatchAction("next");
    nextTutorialStep();
  });

  getTutorialPrevButton()?.addEventListener("click", (event) => {
    event.stopPropagation();
    dispatchAction("back");
    prevTutorialStep();
  });

  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (e.detail.state === "tutorial") return;
    if (isVisible) {
      hideTutorial();
    }
  }) as EventListener);
}
