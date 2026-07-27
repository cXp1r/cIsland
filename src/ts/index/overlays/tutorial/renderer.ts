import { gsap } from "gsap";
import type { TutorialStep } from "./model";
import { tutorialArea, tutorialGsapSlot, tutorialStepLabel, tutorialText, tutorialTitle } from "./dom";

const pyislandLogoUrl = new URL("../../../../assets/icons/PyislandLogo.png", import.meta.url).href;

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

let tutorialDemoTimeline: gsap.core.Timeline | undefined;

function drawDoubleClickDemo(): void {
  const stage = document.createElement("div");
  stage.className = "tutorial-demo-stage";
  stage.setAttribute("aria-hidden", "true");

  const island = document.createElement("div");
  island.className = "tutorial-demo-island";
  const oldPage = document.createElement("span");
  oldPage.className = "tutorial-demo-page";
  oldPage.textContent = "aaa";
  const nextPage = document.createElement("span");
  nextPage.className = "tutorial-demo-page";
  nextPage.textContent = "bbb";
  island.append(oldPage, nextPage);

  const firstClick = document.createElement("i");
  firstClick.className = "tutorial-demo-click";
  const secondClick = document.createElement("i");
  secondClick.className = "tutorial-demo-click";
  const cursor = document.createElement("i");
  cursor.className = "tutorial-demo-cursor";
  stage.append(island, firstClick, secondClick, cursor);
  tutorialGsapSlot.append(stage);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(nextPage, { autoAlpha: 0 });
    return;
  }

  tutorialDemoTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
    .set([oldPage, nextPage], { autoAlpha: 1, y: 0, scale: 1 })
    .set(nextPage, { autoAlpha: 0 })
    .set([firstClick, secondClick], { autoAlpha: 0, scale: 0.25 })
    .fromTo(
      cursor,
      { autoAlpha: 0, x: -110, y: 82, scale: 1, rotation: -12 },
      { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.7, ease: "power3.out" },
    )
    .to(cursor, { scale: 0.78, duration: 0.05, ease: "power1.in" })
    .to(cursor, { scale: 1, duration: 0.06, ease: "power2.out" })
    .fromTo(firstClick, { autoAlpha: 0.7, scale: 0.25 }, { autoAlpha: 0, scale: 2.2, duration: 0.3, ease: "power1.out" }, "<")
    .to(cursor, { scale: 0.78, duration: 0.05, ease: "power1.in" }, "+=0.03")
    .to(cursor, { scale: 1, duration: 0.06, ease: "power2.out" })
    .fromTo(secondClick, { autoAlpha: 0.7, scale: 0.25 }, { autoAlpha: 0, scale: 2.2, duration: 0.3, ease: "power1.out" }, "<")
    .to(oldPage, { autoAlpha: 0, y: -8, scale: 0.985, duration: 0.16, ease: "power2.in" }, "<")
    .fromTo(nextPage, { autoAlpha: 0, y: 8, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.23, ease: "power2.out" })
    .to(cursor, { autoAlpha: 0, duration: 0.2 }, "+=0.45");
}

function drawHoverExpandDemo(): void {
  const stage = document.createElement("div");
  stage.className = "tutorial-demo-stage";
  stage.setAttribute("aria-hidden", "true");

  const screenEdge = document.createElement("div");
  screenEdge.className = "tutorial-demo-screen-edge";
  const hoverZone = document.createElement("div");
  hoverZone.className = "tutorial-demo-hover-zone";

  const islandFrame = document.createElement("div");
  islandFrame.className = "tutorial-demo-hover-frame";
  const island = document.createElement("div");
  island.className = "tutorial-demo-island tutorial-demo-hover-island";
  const oldPage = document.createElement("span");
  oldPage.className = "tutorial-demo-page";
  oldPage.textContent = "aaa";
  const nextPage = document.createElement("span");
  nextPage.className = "tutorial-demo-page";
  nextPage.textContent = "bbb";
  island.append(oldPage, nextPage);
  islandFrame.append(island);

  const exitZone = document.createElement("div");
  exitZone.className = "tutorial-demo-exit-zone";

  const cursor = document.createElement("i");
  cursor.className = "tutorial-demo-cursor tutorial-demo-hover-cursor";
  stage.append(screenEdge, hoverZone, islandFrame, exitZone, cursor);
  tutorialGsapSlot.append(stage);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(nextPage, { autoAlpha: 0 });
    gsap.set(exitZone, { autoAlpha: 0 });
    return;
  }

  tutorialDemoTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
    .set([oldPage, nextPage], { autoAlpha: 1, y: 0, scale: 1 })
    .set(nextPage, { autoAlpha: 0 })
    .set(exitZone, { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" })
    .fromTo(
      cursor,
      { autoAlpha: 0, x: 64, y: 74, scale: 1, rotation: -12 },
      { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.55, ease: "power3.out" },
    )
    .to(islandFrame, { width: 330, height: 74, duration: 0.3, ease: "power3.out" }, "+=0.12")
    .to(hoverZone, { width: 330, duration: 0.3, ease: "power3.out" }, "<")
    .to(exitZone, { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", duration: 0.32, ease: "power1.out" }, "+=0.16")
    .to(cursor, { x: 64, y: 108, rotation: -12, duration: 0.45, ease: "power2.in" }, "+=0.22")
    .to(islandFrame, { width: 184, height: 64, duration: 0.3, ease: "power3.in" })
    .to(hoverZone, { width: 184, duration: 0.3, ease: "power3.in" }, "<")
    .to(exitZone, { autoAlpha: 0, duration: 0.18 }, "<")
    .to(cursor, { autoAlpha: 0, duration: 0.2 }, "<0.22");
}

function drawDotSwitchDemo(): void {
  const stage = document.createElement("div");
  stage.className = "tutorial-demo-stage";
  stage.setAttribute("aria-hidden", "true");

  const screenEdge = document.createElement("div");
  screenEdge.className = "tutorial-demo-screen-edge";
  const hoverZone = document.createElement("div");
  hoverZone.className = "tutorial-demo-hover-zone tutorial-demo-expanded-zone";
  const islandFrame = document.createElement("div");
  islandFrame.className = "tutorial-demo-hover-frame tutorial-demo-expanded-frame";
  const island = document.createElement("div");
  island.className = "tutorial-demo-island tutorial-demo-hover-island";
  const oldPage = document.createElement("span");
  oldPage.className = "tutorial-demo-page";
  oldPage.textContent = "aaa";
  const nextPage = document.createElement("span");
  nextPage.className = "tutorial-demo-page";
  nextPage.textContent = "bbb";
  const thirdPage = document.createElement("span");
  thirdPage.className = "tutorial-demo-page";
  thirdPage.textContent = "ccc";
  const fourthPage = document.createElement("span");
  fourthPage.className = "tutorial-demo-page";
  fourthPage.textContent = "ddd";
  island.append(oldPage, nextPage, thirdPage, fourthPage);
  islandFrame.append(island);

  const dots = document.createElement("div");
  dots.className = "tutorial-demo-dots";
  const dotEls = Array.from({ length: 4 }, () => {
    const dot = document.createElement("i");
    dot.className = "tutorial-demo-dot";
    dots.append(dot);
    return dot;
  });
  const [activeDot] = dotEls;
  activeDot.classList.add("active");

  const click = document.createElement("i");
  click.className = "tutorial-demo-click tutorial-demo-dot-click";
  const cursor = document.createElement("i");
  cursor.className = "tutorial-demo-cursor tutorial-demo-dot-cursor";
  const wheelMouse = document.createElement("div");
  wheelMouse.className = "tutorial-demo-wheel-mouse";
  const wheel = document.createElement("i");
  wheel.className = "tutorial-demo-wheel";
  wheelMouse.append(wheel);
  stage.append(screenEdge, hoverZone, islandFrame, dots, click, cursor, wheelMouse);
  tutorialGsapSlot.append(stage);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set([nextPage, thirdPage, fourthPage], { autoAlpha: 0 });
    return;
  }

  tutorialDemoTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
    .call(() => setActiveDemoDot(dotEls, 0))
    .set([oldPage, nextPage, thirdPage, fourthPage], { autoAlpha: 1, y: 0, scale: 1 })
    .set([nextPage, thirdPage, fourthPage], { autoAlpha: 0 })
    .set(dotEls, { autoAlpha: 1, scale: 1 })
    .set(click, { autoAlpha: 0, scale: 0.25 })
    .set([wheelMouse, wheel], { autoAlpha: 0, y: 0 })
    .fromTo(
      cursor,
      { autoAlpha: 0, x: 0, y: 18, scale: 1, rotation: -12 },
      { autoAlpha: 1, x: -3, y: 62, rotation: 0, duration: 0.45, ease: "power2.inOut" },
    )
    .to(cursor, { scale: 0.78, duration: 0.07, ease: "power1.in" })
    .to(cursor, { scale: 1, duration: 0.1, ease: "power2.out" })
    .fromTo(click, { autoAlpha: 0.7, scale: 0.25 }, { autoAlpha: 0, scale: 2.2, duration: 0.3, ease: "power1.out" }, "<")
    .call(() => setActiveDemoDot(dotEls, 1), undefined, "<")
    .to(oldPage, { autoAlpha: 0, y: -8, scale: 0.985, duration: 0.16, ease: "power2.in" }, "<")
    .fromTo(nextPage, { autoAlpha: 0, y: 8, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.23, ease: "power2.out" })
    .fromTo(wheelMouse, { autoAlpha: 0, x: 0, y: 0 }, { autoAlpha: 1, x: -39, y: -34, duration: 0.2, ease: "power2.out" }, "+=0.2")
    .to(cursor, { autoAlpha: 0, duration: 0.12 }, "<")
    .to(wheel, { autoAlpha: 1, y: 6, duration: 0.12, ease: "power1.in" })
    .to(wheel, { y: 0, duration: 0.12, ease: "power2.out" })
    .call(() => setActiveDemoDot(dotEls, 2), undefined, "<")
    .to(nextPage, { autoAlpha: 0, y: -8, scale: 0.985, duration: 0.16, ease: "power2.in" }, "<")
    .fromTo(thirdPage, { autoAlpha: 0, y: 8, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.23, ease: "power2.out" })
    .to(wheel, { y: 6, duration: 0.12, ease: "power1.in" }, "+=0.18")
    .to(wheel, { y: 0, duration: 0.12, ease: "power2.out" })
    .call(() => setActiveDemoDot(dotEls, 3), undefined, "<")
    .to(thirdPage, { autoAlpha: 0, y: -8, scale: 0.985, duration: 0.16, ease: "power2.in" }, "<")
    .fromTo(fourthPage, { autoAlpha: 0, y: 8, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.23, ease: "power2.out" })
    .to([cursor, wheelMouse], { autoAlpha: 0, duration: 0.2 }, "+=0.45");
}

function setActiveDemoDot(dots: HTMLElement[], activeIndex: number): void {
  dots.forEach((dot, index) => dot.classList.toggle("active", index === activeIndex));
}

function drawShortcutDemo(): void {
  const stage = document.createElement("div");
  stage.className = "tutorial-demo-stage";
  stage.setAttribute("aria-hidden", "true");

  const shortcut = document.createElement("div");
  shortcut.className = "tutorial-demo-shortcut";
  const altKey = document.createElement("kbd");
  altKey.className = "tutorial-demo-keycap";
  altKey.textContent = "Alt";
  const slashKey = document.createElement("kbd");
  slashKey.className = "tutorial-demo-keycap tutorial-demo-slash-key";
  slashKey.textContent = "/";
  shortcut.append(altKey, slashKey);
  stage.append(shortcut);
  tutorialGsapSlot.append(stage);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  tutorialDemoTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
    .set([altKey, slashKey], { y: 0, scale: 1, backgroundColor: "rgba(255, 255, 255, 0.08)" })
    .fromTo(shortcut, { autoAlpha: 0, y: 10, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.24, ease: "power2.out" })
    .to(altKey, { y: 3, scale: 0.94, backgroundColor: "rgba(255, 255, 255, 0.2)", duration: 0.1, ease: "power1.in" }, "+=0.35")
    .to(slashKey, { y: 3, scale: 0.94, backgroundColor: "rgba(255, 255, 255, 0.2)", duration: 0.1, ease: "power1.in" }, "<0.06")
    .to([altKey, slashKey], { y: 0, scale: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", duration: 0.12, ease: "power2.out" }, "+=0.12")
    .to(shortcut, { autoAlpha: 0, duration: 0.2 }, "+=0.4");
}

function drawSettingsMenuDemo(): void {
  const stage = document.createElement("div");
  stage.className = "tutorial-demo-stage";
  stage.setAttribute("aria-hidden", "true");

  const island = document.createElement("div");
  island.className = "tutorial-demo-island tutorial-demo-compact-island";
  const time = document.createElement("span");
  time.className = "tutorial-demo-time";
  const syncTime = () => {
    time.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  };
  syncTime();
  island.append(time);

  const click = document.createElement("i");
  click.className = "tutorial-demo-click tutorial-demo-context-click";
  const cursor = document.createElement("i");
  cursor.className = "tutorial-demo-cursor tutorial-demo-context-cursor";

  const menu = document.createElement("div");
  menu.className = "tutorial-demo-settings-menu";
  const menuItem = document.createElement("span");
  menuItem.textContent = "设置";
  menu.append(menuItem);

  stage.append(island, click, menu, cursor);
  tutorialGsapSlot.append(stage);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set([click, cursor, menu], { autoAlpha: 0 });
    return;
  }

  tutorialDemoTimeline = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.8,
    onUpdate: () => {
      if (menu.style.visibility === "hidden") syncTime();
    },
  })
    .set(menu, { autoAlpha: 0, y: 8, scale: 0.98 })
    .set(click, { autoAlpha: 0, scale: 0.25 })
    .fromTo(
      cursor,
      { autoAlpha: 0, x: 74, y: 48, scale: 1, rotation: -12 },
      { autoAlpha: 1, x: 6, y: 14, rotation: 0, duration: 0.45, ease: "power2.inOut" },
    )
    .to(cursor, { scale: 0.78, duration: 0.08, ease: "power1.in" })
    .to(cursor, { scale: 1, duration: 0.1, ease: "power2.out" })
    .fromTo(click, { autoAlpha: 0.7, scale: 0.25 }, { autoAlpha: 0, scale: 2.2, duration: 0.28, ease: "power1.out" }, "<")
    .set(menu, { autoAlpha: 1, y: 0, scale: 1 })
    .call(() => undefined, undefined, "+=0.6");
}

const tutorialDemoRenderers: Readonly<Partial<Record<number, () => void>>> = {
  0: drawTutorialLogo,
  1: drawDoubleClickDemo,
  2: drawHoverExpandDemo,
  3: drawDotSwitchDemo,
  4: drawSettingsMenuDemo,
  5: drawShortcutDemo,
};

function drawTutorialLogo(): void {
  const logo = document.createElement("img");
  logo.className = "tutorial-demo-logo";
  logo.src = pyislandLogoUrl;
  logo.alt = "PyIsland";
  tutorialGsapSlot.append(logo);
}

function drawPlaceholder(stepIndex: number): void {
  tutorialGsapSlot.textContent = `Animation / Step ${stepIndex + 1}`;
}

export function renderTutorialAnimation(stepIndex: number): void {
  tutorialDemoTimeline?.kill();
  tutorialDemoTimeline = undefined;
  tutorialGsapSlot.replaceChildren();

  const renderDemo = tutorialDemoRenderers[stepIndex];
  if (renderDemo) {
    renderDemo();
    return;
  }
  drawPlaceholder(stepIndex);
}

export function resetTutorialRenderer(): void {
  tutorialDemoTimeline?.kill();
  tutorialDemoTimeline = undefined;
  tutorialGsapSlot.replaceChildren();
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
