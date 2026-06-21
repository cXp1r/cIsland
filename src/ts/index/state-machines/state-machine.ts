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
  getSubmachine(page: PageState): PageSubmachine | undefined;
  createKey(page: PageState, state: string): string;
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
    return this.pageStateMachine.state;
  }

  set currentPage(page: PageState) {
    this.pageStateMachine.state = page;
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

  getSubmachine(page: PageState): PageSubmachine | undefined {
    return this.pageStateMachine.getSubmachine(page);
  }

  createKey(page: PageState, state: string): string {
    return this.pageStateMachine.createKey(page, state);
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
