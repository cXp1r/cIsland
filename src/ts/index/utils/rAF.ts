import { invoke } from "@tauri-apps/api/core";
import { capsule } from "../doms";


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

let raf: number;
let targetW = 0;
let targetH = 0;
let rect = capsule.getBoundingClientRect();
let fromW = Math.round(rect.width);
let fromH = Math.round(rect.height);


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

