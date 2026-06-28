const OVERLAY_POINTER_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
  "wheel",
] as const;

export function stopOverlayPointerEvents(element: HTMLElement): void {
  OVERLAY_POINTER_EVENTS.forEach((type) => {
    element.addEventListener(type, (event) => {
      event.stopPropagation();
    });
  });
}
