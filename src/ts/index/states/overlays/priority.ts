export let overlayPriority: OverlayPriority = -1 as OverlayPriority;
export function setOverlayPriority(v: OverlayPriority) {
  const old = overlayPriority;
  if (old === v) return;
  overlayPriority = v;
  document.dispatchEvent(new CustomEvent("overlay-changed", { detail: { priority: v } }));
}

type OverlayPriority = number;