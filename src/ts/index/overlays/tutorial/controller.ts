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
  renderTutorialAnimation,
  resetTutorialRenderer,
} from "./renderer";
import type { TutorialAction } from "./model";

const TUTORIAL_CAPSULE_WIDTH = 760;
const TUTORIAL_CAPSULE_HEIGHT = 430;
const TUTORIAL_PRIORITY = OverlayPriority.Tutorial;
const TUTORIAL_STEP_COUNT = 6;


const LABEL_NEXT = "下一步";
const LABEL_DONE = "完成";
const LABEL_GSAP = "动画";

const TUTORIAL_STEP_TEXTS = [
  "欢迎来到cIsland岛的教程<br>此岛首字母(C)代表两位开发人员名字开头都为C, 而并非用C/C++编写",
  "岛的第一个切换逻辑是双击 非交互区域 切换",
  "你可以将鼠标先移动到顶部的hover区域触发'展开'<br>'展开'在鼠标彻底移出岛主体后回到当前页面默认大小",
  "在页面点出现后可将鼠标放置在点排列区域  滚动/点击  切换页面",
  "右键岛主体或托盘可打开设置, 注意: 在岛里面右键会暂停岛的所有操作",
  "更多操作可以在设置里面看<br> 忠告: 作者扩展了透明区域, 遇到点不动透明区域可以试着按下隐藏快捷键"
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
    tutorialText.innerHTML = TUTORIAL_STEP_TEXTS[currentStepIndex];
  }

  if (tutorialGsapSlot) {
    tutorialGsapSlot.textContent = `${LABEL_GSAP} / Step ${currentStepIndex + 1}`;
  }
  renderTutorialAnimation(currentStepIndex);
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
