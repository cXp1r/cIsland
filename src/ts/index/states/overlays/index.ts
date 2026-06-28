export let overlayPriority: OverlayPriority = -1 as OverlayPriority;
export function setOverlayPriority(v: OverlayPriority) {
  const old = overlayPriority;
  if (old === v) return;
  overlayPriority = v;
  document.dispatchEvent(new CustomEvent("overlay-changed", { detail: { priority: v } }));
}
export const OverlayState = {
  Idle: "idle",
  Search: "search",
  Notice: "notice",
  Agent: "agent-handler",
} as const;
export type OverlayState = (typeof OverlayState)[keyof typeof OverlayState];

export type OverlayPriority = number;
class OverlayStateMachine {
  state: OverlayState = OverlayState.Idle;
  private priority: number = -1;
  
  set(p: number, s: OverlayState): boolean {
    if (this.check(p)) {
      return false;
    } else {
      this.priority = p;
      this.state = s;
      return true;
    }
  }

  check(p: number): boolean {
    return this.priority <= p
  }

  free(s: OverlayState) {
    if (this.state == s) {
      this.set(-1, OverlayState.Idle)
      return true;
    } else {
      return false;
    }
  }
}

export const overlayStateMachine = new OverlayStateMachine();