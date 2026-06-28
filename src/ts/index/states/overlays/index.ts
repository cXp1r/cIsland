const OverlayState = {
  Idle: "idle",
  Search: "search",
  Notice: "notice",
  Agent: "agent-handler",
} as const;

type OverlayState = (typeof OverlayState)[keyof typeof OverlayState];


export class OverlayStateMachine {
  state: OverlayState = OverlayState.Idle;
  private priority: number = -1;
  
  set(p: number, s: OverlayState): boolean {
    //取较大的
    if (this.check(p)) {
      this.priority = p;
      this.state = s;
      return true;
    } else {
      return false;
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
