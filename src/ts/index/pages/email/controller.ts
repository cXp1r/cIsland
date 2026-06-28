import { invoke } from "@tauri-apps/api/core";
import { capsule } from "../../shell/dom";
import { pageStateMachine } from "../machine";
import { emailPanel, emailResizeHandle } from "./dom";

const EMAIL_DEFAULT_W = 820;
const EMAIL_DEFAULT_H = 620;
const EMAIL_MIN_W = 360;
const EMAIL_MIN_H = 360;
const EMAIL_MAX_H = 1040;

let emailViewW = EMAIL_DEFAULT_W;
let emailViewH = EMAIL_DEFAULT_H;

function bodyExtraHeight(): number {
  const bodyPad = parseFloat(getComputedStyle(document.body).paddingTop) || 5;
  return bodyPad + 5;
}

function maxEmailWidth(): number {
  return Math.max(700, (window.screen.availWidth || EMAIL_DEFAULT_W) - 20);
}

function clampEmailSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.round(Math.max(EMAIL_MIN_W, Math.min(maxEmailWidth(), width))),
    height: Math.round(Math.max(EMAIL_MIN_H, Math.min(EMAIL_MAX_H, height))),
  };
}

export function getEmailWindowSize(): { width: number; height: number } {
  return {
    width: emailViewW,
    height: emailViewH + bodyExtraHeight(),
  };
}

export function applyEmailViewSize(): void {
  document.documentElement.style.setProperty("--email-view-w", `${emailViewW}px`);
  document.documentElement.style.setProperty("--email-view-h", `${emailViewH}px`);
}

export async function onEmailViewEntered(): Promise<void> {
  if (pageStateMachine.state !== "email") return;
  applyEmailViewSize();
}

function setEmailViewSize(width: number, height: number): void {
  const size = clampEmailSize(width, height);
  emailViewW = size.width;
  emailViewH = size.height;
  applyEmailViewSize();
}

export function initEmailController(): void {
  applyEmailViewSize();

  let resizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartW = emailViewW;
  let resizeStartH = emailViewH;
  let syncPending = false;

  emailResizeHandle.addEventListener("mousedown", (e) => {
    if (pageStateMachine.state !== "email") return;
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    resizeStartX = e.screenX;
    resizeStartY = e.screenY;
    resizeStartW = emailViewW;
    resizeStartH = emailViewH;
    capsule.style.transition = "none";
    emailPanel.style.pointerEvents = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    const dx = e.screenX - resizeStartX;
    const dy = e.screenY - resizeStartY;
    setEmailViewSize(resizeStartW + dx, resizeStartH + dy);

    if (!syncPending) {
      syncPending = true;
      requestAnimationFrame(() => {
        syncPending = false;
        const size = getEmailWindowSize();
        invoke("sync_window_size", {
          width: size.width,
          height: size.height,
          reposition: false,
        }).catch(() => {});
      });
    }
  });

  document.addEventListener("mouseup", async () => {
    if (!resizing) return;
    resizing = false;
    capsule.style.transition = "";
    emailPanel.style.pointerEvents = "";
    const size = getEmailWindowSize();
    try {
      await invoke("sync_window_size", {
        width: size.width,
        height: size.height,
        reposition: false,
      });
    } catch {
      /* ignore */
    }
  });
}

