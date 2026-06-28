import { initOverlaysController } from "./controller";

export function initOverlays(): void {
  initOverlaysController();
}

export * from "./manager";
export * from "./priority";
export * from "./registry";
export * from "./types";
