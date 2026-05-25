import { invoke } from '@tauri-apps/api/core'
import { listen } from "@tauri-apps/api/event";
import { capsule } from "../dom";

//import { getAvailableViews, setView, updateSwitcherUI, updateCapsuleSize } from "./view-switcher";
const ease = (p1x: number, p1y: number, p2x: number, p2y: number) => {
  const calcX = (t: number) => 3 * p1x * t * (1-t)**2 + 3 * p2x * t**2 * (1-t) + t**3
  const calcY = (t: number) => 3 * p1y * t * (1-t)**2 + 3 * p2y * t**2 * (1-t) + t**3
  const solveT = (x: number) => {
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 64; i++) {
      const cx = calcX(t)
      if (Math.abs(cx - x) < 1e-9) break
      cx < x ? lo = t : hi = t
      t = (lo + hi) / 2
    }
    return t
  }
  return (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : calcY(solveT(x))
}
const easing = ease(0.25, 1, 0.5, 1)


const { port1, port2 } = new MessageChannel()


let raf: number
let targetW: number = 0
let targetH: number = 0
let rect = capsule.getBoundingClientRect()
let fromW = Math.round(rect.width)
let fromH = Math.round(rect.height)
port1.onmessage = ({ data }: MessageEvent<{ w: number; h: number; lw: number; t: number; e: number, gen: number, smaller: boolean }>) => {
  if (data.t >= 1) {
    void invoke('end_raf', { gen: data.gen ?? 1});
  } else {
    void invoke('resize_raf', {
      width: data.w,
      height: data.h + 10,
      lwidth: data.lw,
      ewidth: targetW,
      reposition: 1,
      smaller: data.smaller,
      t: data.t,
    })
  }
  
}
//高减小作为缩小的判定
export function animateCapsule(toW: number, toH: number): void {
  if (toW === targetW && toH === targetH) return
  void invoke('set_capsule_target_rect', { height: toH, width: toW });
  let gen = 0;
  invoke<number>('start_raf').then((u: number) => {
    gen = u;
  });
  
  targetW = toW
  targetH = toH
  
  cancelAnimationFrame(raf)

  const startW = parseFloat(capsule.style.width) || fromW
  const startH = parseFloat(capsule.style.height) || fromH
  let smaller = startH > toH;
  const start = performance.now()
  let lw = startW
  function frame(now: number): void {
    
    const t = Math.min((now - start) / 300, 1)
    const e = easing(t)
    const w = (Math.round(startW + (toW - startW) * e) + 1) & ~1
    const h = (Math.round(startH + (toH - startH) * e) + 1) & ~1

    capsule.style.width  = w + 'px'
    capsule.style.height = h + 'px'
    port2.postMessage({ w, h, lw, t, e, gen, smaller })

    if (t < 1) {
      raf = requestAnimationFrame(frame)
    }
    lw = w
  }

  raf = requestAnimationFrame(frame)
}




export function initrAF() { 
   listen<boolean>("set-expand", (event) => {
    if (event.payload) {
      if (capsule.classList.contains("email-expanded") || capsule.classList.contains("agent-expanded") || capsule.classList.contains("music-expanded")) return;
      capsule.classList.add("expanded");
    } else {
      capsule.classList.remove("expanded");
    }
  });
  // 预热 MessageChannel
  port2.postMessage({ w: 0, h: 0, lw: 0, t: 0, e: 0, gen: 0, smaller: false });
  // 实则两个相近态的dx<100时建议统一,否则动画会出现割裂
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        if (!capsule.classList.contains("sadb-expanded")){
          let [toW, toH] = [140, 50];
          if (capsule.classList.value == "") {
          } else if (capsule.classList.contains("panel-expanded") || capsule.classList.contains("hooks-expanded")) {
            [toW, toH] = [700, 220];
          } else if (capsule.classList.contains("music-expanded")) {
            [toW, toH] = [380, 420];
          } else if (capsule.classList.contains("agent-expanded")) {
            [toW, toH] = [640, 620];
          } else if (capsule.classList.contains("sadb-idle")) {
            [toW, toH] = [380, 420];
          } else if (capsule.classList.contains("email-expanded")) {
            const style = getComputedStyle(document.documentElement);
            [toW, toH] = [parseInt(style.getPropertyValue('--email-view-w')), parseInt(style.getPropertyValue('--email-view-h')),];
          } else if (capsule.classList.contains("expanded")) {
            [toW, toH] = [330, 74];
            if (capsule.classList.contains("lyric-collapsed")) {
              toW = 380;
            }
          } else if (capsule.classList.contains("lyric-collapsed")) {
            [toW, toH] = [380, 50];
          }
          animateCapsule(toW, toH);
        }
      }
    }
  });
  observer.observe(capsule, {
    attributes: true,
    attributeFilter: ['class']  // 只监听 class，不监听其他属性
  });
}