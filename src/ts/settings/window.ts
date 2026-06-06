import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let bound = false;
let isResizing = false;
let resizeDirection = "";
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let startPosX = 0;
let startPosY = 0;

export function initSettingsWindow(): void {
  if (bound) return;
  const appWindow = getCurrentWindow();

  document.querySelectorAll<HTMLElement>(".resize-handle").forEach((handle) => {
    handle.addEventListener("mousedown", async (e: MouseEvent) => {
      e.preventDefault();
      isResizing = true;
      resizeDirection = handle.dataset.direction || "";
      startX = e.screenX;
      startY = e.screenY;

      const size = await appWindow.outerSize();
      const position = await appWindow.outerPosition();
      startWidth = size.width;
      startHeight = size.height;
      startPosX = position.x;
      startPosY = position.y;
    });
  });

  document.addEventListener("mousemove", async (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.screenX - startX;
    const deltaY = e.screenY - startY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startPosX;
    let newY = startPosY;
    const minWidth = 600;
    const minHeight = 400;

    if (resizeDirection.includes("e")) newWidth = Math.max(minWidth, startWidth + deltaX);
    if (resizeDirection.includes("w")) {
      const width = startWidth - deltaX;
      if (width >= minWidth) {
        newWidth = width;
        newX = startPosX + deltaX;
      }
    }
    if (resizeDirection.includes("s")) newHeight = Math.max(minHeight, startHeight + deltaY);
    if (resizeDirection.includes("n")) {
      const height = startHeight - deltaY;
      if (height >= minHeight) {
        newHeight = height;
        newY = startPosY + deltaY;
      }
    }

    await appWindow.setSize(new LogicalSize(newWidth, newHeight));
    if (newX !== startPosX || newY !== startPosY) {
      await appWindow.setPosition(new LogicalPosition(newX, newY));
    }
  });

  document.addEventListener("mouseup", () => {
    isResizing = false;
    resizeDirection = "";
  });

  void $<HTMLElement>("status");
  bound = true;
}
