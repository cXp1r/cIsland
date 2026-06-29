import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { emailDragHandle } from "../pages/email/dom";
import { pageStateMachine } from "../pages/machine";
import { capsule } from "./dom";

export function showContextMenu(): void {
  void invoke("show_context_menu");
}

let isDragging = false;
let lastX = 0;
let lastY = 0;
let mouseDownX = 0;
let mouseDownY = 0;

const DRAG_THRESHOLD = 5;

function beginWindowDrag(screenX: number, screenY: number): void {
  isDragging = true;
  pageStateMachine.isDragging = false;
  lastX = screenX;
  lastY = screenY;
  mouseDownX = screenX;
  mouseDownY = screenY;
}

function moveWindowDrag(screenX: number, screenY: number): void {
  if (!isDragging) return;

  const dx = screenX - lastX;
  const dy = screenY - lastY;

  if (!pageStateMachine.isDragging) {
    const totalDx = Math.abs(screenX - mouseDownX);
    const totalDy = Math.abs(screenY - mouseDownY);
    if (totalDx < DRAG_THRESHOLD && totalDy < DRAG_THRESHOLD) return;

    pageStateMachine.isDragging = true;
    void invoke("start_drag");
  }

  lastX = screenX;
  lastY = screenY;

  if (dx !== 0 || dy !== 0) {
    void invoke("drag_move", { dx, dy });
  }
}

function endWindowDrag(): void {
  if (!isDragging) return;

  isDragging = false;

  if (pageStateMachine.isDragging) {
    void invoke("end_drag");
    window.setTimeout(() => {
      pageStateMachine.isDragging = false;
    }, 100);
  }
}

export function initShellDrag(): void {
  listen<string>("context-menu-action", (event) => {
    const action = event.payload;
    if (action === "settings") {
      setTimeout(() => {
        void invoke("open_settings");
      }, 100);
    }
  });

  capsule.addEventListener("mousedown", (e: MouseEvent) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (
      target.closest("#email-drag-handle")
      || target.closest("#sadb-resize-handle")
      || target.closest(".url-item")
      || target.closest("#notice-area")
      || target.closest(".media-btn")
      || target.closest("#music-panel-controls")
      || target.closest("#music-panel-progress")
      || target.closest("#music-panel-volume")
      || target.closest(".mp-btn")
      || target.closest(".mp-progress-bar")
      || target.closest(".mp-volume-bar")
      || target.closest(".view-dot")
      || target instanceof HTMLInputElement
    ) {
      return;
    }

    beginWindowDrag(e.screenX, e.screenY);
  });

  emailDragHandle.addEventListener("pointerdown", (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    emailDragHandle.setPointerCapture(e.pointerId);
    beginWindowDrag(e.screenX, e.screenY);
  });

  emailDragHandle.addEventListener("pointermove", (e: PointerEvent) => {
    e.preventDefault();
    moveWindowDrag(e.screenX, e.screenY);
  });

  emailDragHandle.addEventListener("pointerup", (e: PointerEvent) => {
    if (emailDragHandle.hasPointerCapture(e.pointerId)) {
      emailDragHandle.releasePointerCapture(e.pointerId);
    }
    endWindowDrag();
  });

  emailDragHandle.addEventListener("pointercancel", (e: PointerEvent) => {
    if (emailDragHandle.hasPointerCapture(e.pointerId)) {
      emailDragHandle.releasePointerCapture(e.pointerId);
    }
    endWindowDrag();
  });

  emailDragHandle.addEventListener("lostpointercapture", () => {
    endWindowDrag();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (!isDragging) return;
    moveWindowDrag(e.screenX, e.screenY);
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    endWindowDrag();
  });
}
