import type { ViewMode } from "../types";
import { PageState } from "./page";
import type {
  PageStateMachine,
  PageSubmachine,
} from "./page-machine";
import { pageStateMachine as pageStateMachineImpl } from "./page-machine";
import type { OverlayStateMachine } from "./overlay-machine";
import { overlayStateMachine } from "./overlay-machine";

export interface StateMachine {
  readonly pageStateMachine: PageStateMachine;
  readonly overlay: OverlayStateMachine;
  readonly substates: PageStateMachine["substates"];

  currentPage: PageState;
  overlayPriority: OverlayStateMachine["priority"];

  getCurrentPage(): PageState;
  setCurrentPage(page: PageState): void;
  currentPageAsViewMode(): ViewMode;
  getPageState(page: PageState): string | undefined;
  setPageState(page: PageState, state: string): void;
  getSubmachine(page: PageState): PageSubmachine | undefined;
  getSubmachineState(page: PageState): string | undefined;
  createKey(page: PageState, state: string): string;
  getPageClasses(page: PageState): string;
  setPageClasses(page: PageState, classValue: string): string;
  savePageClasses(page: PageState, classList: DOMTokenList): string | undefined;
  applyPageClasses(page: PageState, classList: DOMTokenList): string | undefined;
  syncPageState(page: PageState, classList: DOMTokenList): string | undefined;
  isOverlayOccupied(): boolean;
  canPreempt(incoming: OverlayStateMachine["priority"], current?: OverlayStateMachine["priority"]): boolean;
}

class StateMachineImpl implements StateMachine {
  readonly pageStateMachine = pageStateMachineImpl;
  readonly overlay = overlayStateMachine;

  get substates(): PageStateMachine["substates"] {
    return this.pageStateMachine.substates;
  }

  get currentPage(): PageState {
    return this.pageStateMachine.currentPage;
  }

  set currentPage(page: PageState) {
    this.pageStateMachine.currentPage = page;
  }

  get overlayPriority(): OverlayStateMachine["priority"] {
    return this.overlay.priority;
  }

  set overlayPriority(v: OverlayStateMachine["priority"]) {
    this.overlay.setPriority(v);
  }

  getCurrentPage(): PageState {
    return this.pageStateMachine.getCurrentPage();
  }

  setCurrentPage(page: PageState): void {
    this.pageStateMachine.setCurrentPage(page);
  }

  currentPageAsViewMode(): ViewMode {
    return this.pageStateMachine.currentPageAsViewMode();
  }

  getPageState(page: PageState): string | undefined {
    return this.pageStateMachine.getPageState(page);
  }

  setPageState(page: PageState, state: string): void {
    this.pageStateMachine.setPageState(page, state);
  }

  getSubmachine(page: PageState): PageSubmachine | undefined {
    return this.pageStateMachine.getSubmachine(page);
  }

  getSubmachineState(page: PageState): string | undefined {
    return this.pageStateMachine.getSubmachineState(page);
  }

  createKey(page: PageState, state: string): string {
    return this.pageStateMachine.createKey(page, state);
  }

  getPageClasses(page: PageState): string {
    return this.pageStateMachine.getPageClasses(page);
  }

  setPageClasses(page: PageState, classValue: string): string {
    return this.pageStateMachine.setPageClasses(page, classValue);
  }

  savePageClasses(page: PageState, classList: DOMTokenList): string | undefined {
    return this.pageStateMachine.savePageClasses(page, classList);
  }

  applyPageClasses(page: PageState, classList: DOMTokenList): string | undefined {
    return this.pageStateMachine.applyPageClasses(page, classList);
  }

  syncPageState(page: PageState, classList: DOMTokenList): string | undefined {
    return this.pageStateMachine.syncPageState(page, classList);
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
