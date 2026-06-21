import { OverlayPriority } from "./overlay";

export interface OverlayStateMachine {
  state: OverlayPriority;
  priority: OverlayPriority;
  setPriority(v: OverlayPriority): void;
  isOccupied(): boolean;
  canPreempt(incoming: OverlayPriority, current?: OverlayPriority): boolean;
}

export class OverlayStateMachineImpl implements OverlayStateMachine {
  priority: OverlayPriority = OverlayPriority.None;

  get state(): OverlayPriority {
    return this.priority;
  }

  set state(v: OverlayPriority) {
    this.setPriority(v);
  }

  setPriority(v: OverlayPriority): void {
    const old = this.priority;
    if (old === v) return;
    this.priority = v;
    document.dispatchEvent(new CustomEvent("overlay-changed", { detail: { priority: v } }));
  }

  isOccupied(): boolean {
    return this.priority !== OverlayPriority.None;
  }

  canPreempt(incoming: OverlayPriority, current: OverlayPriority = this.priority): boolean {
    return incoming > current;
  }
}

export const overlayStateMachine: OverlayStateMachine = new OverlayStateMachineImpl();
