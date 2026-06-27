import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  capsule,
  emailDragHandle
} from "../doms";

import { pageStateMachine } from "../states";


export function showContextMenu() {
  void invoke("show_context_menu");
}

let isDragging = false;
let lastX = 0;
let lastY = 0;
let mouseDownX = 0;
let mouseDownY = 0;

const DRAG_THRESHOLD = 5;

function beginWindowDrag(screenX: number, screenY: number) {
  isDragging = true;
  pageStateMachine.isDragging = false;
  lastX = screenX;
  lastY = screenY;
  mouseDownX = screenX;
  mouseDownY = screenY;
}

function moveWindowDrag(screenX: number, screenY: number) {
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

function endWindowDrag() {
  if (!isDragging) return;

  isDragging = false;

  if (pageStateMachine.isDragging) {
    void invoke("end_drag");
    window.setTimeout(() => {
      pageStateMachine.isDragging = false;
    }, 100);
  }
}

export function initDragger() {
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
      || target.closest(".view-dot")
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
