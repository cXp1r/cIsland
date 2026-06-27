import { DispatchAction, PageState } from "../page";
import { PageSubstateMachine } from "./common";


export const SadbPageSubstate = {
  Collapsed: "collapsed",
  Idle: "idle",
  Mirroring: "mirroring",
} as const;

export type SadbPageSubstate = (typeof SadbPageSubstate)[keyof typeof SadbPageSubstate];

export class SadbPageSubstateMachine extends PageSubstateMachine<SadbPageSubstate> {
  constructor() {
    super(PageState.Sadb, SadbPageSubstate.Collapsed);
  }

  selectIp: string | null = null;
  mouseButtons = 0;
  drawRect = { x: 0, y: 0, w: 0, h: 0 };
  deviceW = 0;
  clipboardPollInterval: ReturnType<typeof setInterval> | null = null;
  currentSerial: string | null = null;
  //粘贴板滚core去呆着
  pcClipboard: { text: string; timestamp: number } | null = null;
  phoneClipboard: { text: string; timestamp: number } | null = null;
  lastSyncedText: string | null = null;

  dispatch(action: DispatchAction): void {
    if ( action.tag == "click" ) {
      const { target, event } = action;

      const sadbState = this.state;
      
      if (sadbState === SadbPageSubstate.Mirroring) return;
      if (sadbState === SadbPageSubstate.Idle) {
        if (!target.closest("#sadb-status-bar")) return;
        event.stopPropagation();
        this.debouncedAction(() => {
          this.transitionTo(SadbPageSubstate.Collapsed);
        });
        return;
      }

      if (
        target.closest("#sadb-btn-start")
        || target.closest("#sadb-btn-stop")
        || target.closest("#sadb-canvas")
        || target.closest("#sadb-resize-handle")
      ) return;

      event.stopPropagation();
      this.debouncedAction(() => {
        this.transitionTo(SadbPageSubstate.Idle);
      });
    } else if (action.tag == "core") {
      switch (action.event) {
        case "start":
          this.transitionTo(SadbPageSubstate.Mirroring);
          break;
          
        case "stop":
          this.transitionTo(SadbPageSubstate.Idle);
          break;

        default:
          break;
      }
    }

    
  }
}

export const sadbPageSubstateMachine = new SadbPageSubstateMachine();
