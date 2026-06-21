import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  capsule,
  collapsedIndicator,
  emailDragHandle,
} from "../dom";
import {
  isDragging, setIsDragging,
  dragStarted, setDragStarted,
  lastX, setLastX,
  lastY, setLastY,
  mouseDownX, setMouseDownX,
  mouseDownY, setMouseDownY,
  DRAG_THRESHOLD,
} from "../state";
import { ManualPageState } from "../state-machines/page";
import { pageStateMachine } from "../state-machines/page-machine";

// ===== 鏀惰捣/灞曞紑鍔熻兘 =====

export function applyIndicatorColor(color: string) {

  collapsedIndicator.style.background = `linear-gradient(90deg, ${color}dd, ${color}, ${color}dd)`;

  collapsedIndicator.style.boxShadow = `0 0 8px ${color}80`;

}












export function showContextMenu() {
  void invoke("show_context_menu");
}



function beginWindowDrag(screenX: number, screenY: number) {

  setIsDragging(true);

  setDragStarted(false);

  setLastX(screenX);

  setLastY(screenY);

  setMouseDownX(screenX);

  setMouseDownY(screenY);

}



function moveWindowDrag(screenX: number, screenY: number) {

  if (!isDragging) return;

  const dx = screenX - lastX;

  const dy = screenY - lastY;

  if (!dragStarted) {

    const totalDx = Math.abs(screenX - mouseDownX);

    const totalDy = Math.abs(screenY - mouseDownY);

    if (totalDx < DRAG_THRESHOLD && totalDy < DRAG_THRESHOLD) return;

    setDragStarted(true);

    void invoke("start_drag");

  }

  setLastX(screenX);

  setLastY(screenY);

  if (dx !== 0 || dy !== 0) {

    void invoke("drag_move", { dx, dy });

  }

}



function endWindowDrag() {

  if (!isDragging) return;

  setIsDragging(false);

  if (dragStarted) {

    void invoke("end_drag");

    window.setTimeout(() => { setDragStarted(false); }, 100);

  }

}



export function initDragger() {

  // 鐩戝惉鑿滃崟鍔ㄤ綔

  listen<string>("context-menu-action", (event) => {

    const action = event.payload;

    if (action === "settings") {

      // 寤惰繜鎵ц锛岀‘淇濊彍鍗曞畬鍏ㄥ叧闂悗鍐嶆墦寮€璁剧疆绐楀彛

      setTimeout(() => {

        void invoke("open_settings");

      }, 100);

    }

  });


  listen<string>("indicator-color-changed", (event) => {

    applyIndicatorColor(event.payload);

  });



  capsule.addEventListener("mousedown", (e: MouseEvent) => {

    // 鍙抽敭涓嶈Е鍙戞嫋鍔?

    if (e.button !== 0) return;

    const target = e.target as HTMLElement;

    if (target.closest("#email-drag-handle") || target.closest(".url-item") || target.closest("#notice-area") || target.closest(".media-btn") || target.closest(".view-dot")) {

      return;

    }

    // Agent 灞曞紑鎬佷笅锛屾帓闄よ緭鍏ユ鍜屾寜閽紝浣嗗厑璁告嫋鍔ㄧ姸鎬佹爮鍜屾秷鎭尯鍩?

    if (pageStateMachine.getCurrentPage() === ManualPageState.Agent && capsule.classList.contains("agent-expanded")) {

      if (target.closest("#agent-input") || target.closest("#agent-send-btn") || target.closest("#agent-stop-btn") || target.closest("#agent-clear-btn")) {

        return;

      }

    }



    beginWindowDrag(e.screenX, e.screenY);

  });



  emailDragHandle.addEventListener("pointerdown", (e: PointerEvent) => {

    if (pageStateMachine.getCurrentPage() !== ManualPageState.Email || e.button !== 0) return;

    e.preventDefault();

    e.stopPropagation();

    emailDragHandle.setPointerCapture(e.pointerId);

    beginWindowDrag(e.screenX, e.screenY);

  });

  emailDragHandle.addEventListener("pointermove", (e: PointerEvent) => {

    if (pageStateMachine.getCurrentPage() !== ManualPageState.Email || !emailDragHandle.hasPointerCapture(e.pointerId)) return;

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
