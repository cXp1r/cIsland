import type { ViewMode } from "../types";
import { ManualPageState } from "./page";
import type {
  PageStateMachine,
  ManualPageSubmachine,
} from "./page-machine";
import { pageStateMachine } from "./page-machine";
import type { OverlayStateMachine } from "./overlay-machine";
import { overlayStateMachine } from "./overlay-machine";

export interface StateMachine {
  readonly manualPage: PageStateMachine;
  readonly overlay: OverlayStateMachine;
  readonly substates: PageStateMachine["substates"];

  currentPage: ManualPageState;
  overlayPriority: OverlayStateMachine["priority"];

  getCurrentPage(): ManualPageState;
  setCurrentPage(page: ManualPageState): void;
  currentPageAsViewMode(): ViewMode;
  getPageState(page: ManualPageState): string | undefined;
  setPageState(page: ManualPageState, state: string): void;
  getSubmachine(page: ManualPageState): ManualPageSubmachine | undefined;
  getSubmachineState(page: ManualPageState): string | undefined;
  createKey(page: ManualPageState, state: string): string;
  getPageClasses(page: ManualPageState): string;
  setPageClasses(page: ManualPageState, classValue: string): string;
  savePageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined;
  applyPageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined;
  syncPageState(page: ManualPageState, classList: DOMTokenList): string | undefined;
  isOverlayOccupied(): boolean;
  canPreempt(incoming: OverlayStateMachine["priority"], current?: OverlayStateMachine["priority"]): boolean;
}

class StateMachineImpl implements StateMachine {
  readonly manualPage = pageStateMachine;
  readonly overlay = overlayStateMachine;

  get substates(): PageStateMachine["substates"] {
    return this.manualPage.substates;
  }

  get currentPage(): ManualPageState {
    return this.manualPage.currentPage;
  }

  set currentPage(page: ManualPageState) {
    this.manualPage.currentPage = page;
  }

  get overlayPriority(): OverlayStateMachine["priority"] {
    return this.overlay.priority;
  }

  set overlayPriority(v: OverlayStateMachine["priority"]) {
    this.overlay.setPriority(v);
  }

  getCurrentPage(): ManualPageState {
    return this.manualPage.getCurrentPage();
  }

  setCurrentPage(page: ManualPageState): void {
    this.manualPage.setCurrentPage(page);
  }

  currentPageAsViewMode(): ViewMode {
    return this.manualPage.currentPageAsViewMode();
  }

  getPageState(page: ManualPageState): string | undefined {
    return this.manualPage.getPageState(page);
  }

  setPageState(page: ManualPageState, state: string): void {
    this.manualPage.setPageState(page, state);
  }

  getSubmachine(page: ManualPageState): ManualPageSubmachine | undefined {
    return this.manualPage.getSubmachine(page);
  }

  getSubmachineState(page: ManualPageState): string | undefined {
    return this.manualPage.getSubmachineState(page);
  }

  createKey(page: ManualPageState, state: string): string {
    return this.manualPage.createKey(page, state);
  }

  getPageClasses(page: ManualPageState): string {
    return this.manualPage.getPageClasses(page);
  }

  setPageClasses(page: ManualPageState, classValue: string): string {
    return this.manualPage.setPageClasses(page, classValue);
  }

  savePageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined {
    return this.manualPage.savePageClasses(page, classList);
  }

  applyPageClasses(page: ManualPageState, classList: DOMTokenList): string | undefined {
    return this.manualPage.applyPageClasses(page, classList);
  }

  syncPageState(page: ManualPageState, classList: DOMTokenList): string | undefined {
    return this.manualPage.syncPageState(page, classList);
  }

  isOverlayOccupied(): boolean {
    return this.overlay.isOccupied();
  }

  canPreempt(
    incoming: OverlayStateMachine["priority"],
    current?: OverlayStateMachine["priority"],
  ): boolean {
    return this.overlay.canPreempt(incoming, current);
  }
}

export const stateMachine: StateMachine = new StateMachineImpl();
