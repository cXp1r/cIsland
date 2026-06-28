import { initPageStateMachine } from "./machine";
import { initPagesController } from "./controller";
import { initPagesRenderer } from "./renderer";

export function initPages(): void {
  initPageStateMachine();
  initPagesRenderer();
  initPagesController();
}

export * from "./types";
export * from "./machine";
export * from "./registry";
export * from "./substate-machine";
