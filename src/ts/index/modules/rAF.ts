import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { capsule } from "../dom";
import { currentView } from "../state";
import { ManualPageState, isManualPageState } from "../state-machines/page";
import {
  createPageSubmachineKey,
  getPageState,
} from "../state-machines/page-submachines";

const ease = (p1x: number, p1y: number, p2x: number, p2y: number) => {
  const calcX = (t: number) => 3 * p1x * t * (1 - t) ** 2 + 3 * p2x * t ** 2 * (1 - t) + t ** 3;
  const calcY = (t: number) => 3 * p1y * t * (1 - t) ** 2 + 3 * p2y * t ** 2 * (1 - t) + t ** 3;
  const solveT = (x: number) => {
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 64; i++) {
      const cx = calcX(t);
      if (Math.abs(cx - x) < 1e-9) break;
      cx < x ? (lo = t) : (hi = t);
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : calcY(solveT(x)));
};

const easing = ease(0.25, 1, 0.5, 1);
const { port1, port2 } = new MessageChannel();

type CapsuleSize = [number, number];
type SizeKey = `${ManualPageState}:${string}`;

const DEFAULT_SIZE: CapsuleSize = [140, 50];

const SADB_IDLE_SIZE: CapsuleSize = [400, 440];
const DOWNLOADER_SIZE: CapsuleSize = [400, 300];
const PANEL_EXPANDED_SIZE: CapsuleSize = [700, 220];
const MUSIC_EXPANDED_SIZE: CapsuleSize = [380, 420];
const SEARCH_SIZE: CapsuleSize = [420, 50];
const SEARCH_EXPANDED_SIZE: CapsuleSize = [420, 430];
const NOTICE_SIZE: CapsuleSize = [400, 70];

const sizeTable: Record<SizeKey, CapsuleSize> = {
  [createPageSubmachineKey(ManualPageState.Time, "collapsed")]: DEFAULT_SIZE,
  [createPageSubmachineKey(ManualPageState.Time, "expanded")]: PANEL_EXPANDED_SIZE,
  [createPageSubmachineKey(ManualPageState.Lyric, "collapsed")]: [340, 50] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Lyric, "expanded")]: MUSIC_EXPANDED_SIZE,
  [createPageSubmachineKey(ManualPageState.Lyric, "seeking")]: MUSIC_EXPANDED_SIZE,
  [createPageSubmachineKey(ManualPageState.Agent, "collapsed")]: DEFAULT_SIZE,
  [createPageSubmachineKey(ManualPageState.Agent, "expanded")]: [640, 620] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Agent, "thinking")]: [640, 620] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Agent, "generating")]: [640, 620] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Sadb, "collapsed")]: DEFAULT_SIZE,
  [createPageSubmachineKey(ManualPageState.Sadb, "idle_panel")]: SADB_IDLE_SIZE,
  [createPageSubmachineKey(ManualPageState.Sadb, "mirroring")]: SADB_IDLE_SIZE,
  [createPageSubmachineKey(ManualPageState.Email, "collapsed")]: [620, 620] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Email, "expanded")]: [620, 620] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Email, "dragging")]: [620, 620] as CapsuleSize,
  [createPageSubmachineKey(ManualPageState.Downloader, "collapsed")]: DEFAULT_SIZE,
  [createPageSubmachineKey(ManualPageState.Downloader, "expanded")]: DOWNLOADER_SIZE,
  [createPageSubmachineKey(ManualPageState.Downloader, "downloading")]: DOWNLOADER_SIZE,
};

let raf: number;
let targetW = 0;
let targetH = 0;
let rect = capsule.getBoundingClientRect();
let fromW = Math.round(rect.width);
let fromH = Math.round(rect.height);

function resolveTargetSize(): CapsuleSize {
  let res = [0, 0] as CapsuleSize;
  if (isManualPageState(currentView)) {
    const state = getPageState(currentView);
    if (state) {
      const key = createPageSubmachineKey(currentView, state) as keyof typeof sizeTable;
      const nextSize = sizeTable[key];
      if (nextSize) res = nextSize;
    }
  }

  if (capsule.classList.contains("search-active")) {
    res = SEARCH_SIZE;
  }

  if (capsule.classList.contains("search-expanded")) {
    res = SEARCH_EXPANDED_SIZE;
  }

  if (capsule.classList.contains("notice-active")) {
    res = NOTICE_SIZE;
  }

  if (capsule.classList.contains("agent-handler-active")) {
    const style = getComputedStyle(document.documentElement);
    const w = parseInt(style.getPropertyValue("--agent-handler-w"), 10);
    const h = parseInt(style.getPropertyValue("--agent-handler-h"), 10);
    res = [
      Number.isFinite(w) ? w : DEFAULT_SIZE[0],
      Number.isFinite(h) ? h : DEFAULT_SIZE[1],
    ];
  }
  if (capsule.classList.contains("expanded")) {
    res = [
      Math.max(res[0], 330),
      Math.max(res[1], 74),
    ];
  }
  return res;
}

port1.onmessage = ({ data }: MessageEvent<{ w: number; h: number; lw: number; t: number; e: number; gen: number; smaller: boolean }>) => {
  if (data.t >= 1) {
    void invoke("end_raf", { gen: data.gen ?? 1 });
    return;
  }

  void invoke("resize_raf", {
    width: data.w,
    height: data.h + 10,
    lwidth: data.lw,
    ewidth: targetW,
    reposition: 1,
    smaller: data.smaller,
    t: data.t,
  });
};

// 高减少作为缩小的判断
export function animateCapsule(toW: number, toH: number): void {
  if (toW === targetW && toH === targetH) return;
  void invoke("set_capsule_target_rect", { height: toH, width: toW });
  let gen = 0;
  invoke<number>("start_raf").then((u: number) => {
    gen = u;
  });

  targetW = toW;
  targetH = toH;

  cancelAnimationFrame(raf);

  const startW = parseFloat(capsule.style.width) || fromW;
  const startH = parseFloat(capsule.style.height) || fromH;
  const smaller = startH > toH;
  const start = performance.now();
  let lw = startW;

  function frame(now: number): void {
    const t = Math.min((now - start) / 300, 1);
    const e = easing(t);
    const w = (Math.round(startW + (toW - startW) * e) + 1) & ~1;
    const h = (Math.round(startH + (toH - startH) * e) + 1) & ~1;

    capsule.style.width = `${w}px`;
    capsule.style.height = `${h}px`;
    port2.postMessage({ w, h, lw, t, e, gen, smaller });

    if (t < 1) {
      raf = requestAnimationFrame(frame);
    }
    lw = w;
  }

  raf = requestAnimationFrame(frame);
}

export function animateHeight(toH: number): void {
  const toW = parseFloat(capsule.style.width) || fromW;
  if (toH === targetH) return;
  void invoke("set_capsule_target_rect", { height: toH, width: toW });
  let gen = 0;
  invoke<number>("start_raf").then((u: number) => {
    gen = u;
  });

  targetW = toW;
  targetH = toH;

  cancelAnimationFrame(raf);

  const startW = parseFloat(capsule.style.width) || fromW;
  const startH = parseFloat(capsule.style.height) || fromH;
  const smaller = startH > toH;
  const start = performance.now();

  function frame(now: number): void {
    const t = Math.min((now - start) / 300, 1);
    const e = easing(t);
    const h = (Math.round(startH + (toH - startH) * e) + 1) & ~1;

    capsule.style.height = `${h}px`;
    port2.postMessage({ w: startW, h, lw: startW, t, e, gen, smaller });

    if (t < 1) {
      raf = requestAnimationFrame(frame);
    }
  }

  raf = requestAnimationFrame(frame);
}

export function initrAF() {
  listen<boolean>("set-expand", (event) => {
    if (event.payload) {
      if (
        capsule.classList.contains("email-expanded") ||
        capsule.classList.contains("agent-expanded") ||
        capsule.classList.contains("music-expanded")
      ) return;
      capsule.classList.add("expanded");
    } else {
      capsule.classList.remove("expanded");
    }
  });

  port2.postMessage({ w: 0, h: 0, lw: 0, t: 0, e: 0, gen: 0, smaller: false });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName !== "class") continue;
      const [toW, toH] = resolveTargetSize();
      animateCapsule(toW, toH);
    }
  });

  observer.observe(capsule, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
