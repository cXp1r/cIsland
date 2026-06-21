import { PageState } from "../page";
import { invoke } from "@tauri-apps/api/core";
import { PageSubstateMachine, debouncedAction, type PageSubstateAction } from "./common";
import {
  isExpandAnimating,
  sadbClickTimer,
  setIsExpandAnimating,
  setSadbClickTimer,
} from "../../state";
import { capsule } from "../../dom";

export const SadbPageSubstate = {
  Collapsed: "collapsed",
  IdlePanel: "idle_panel",
  Mirroring: "mirroring",
} as const;

export type SadbPageSubstate = (typeof SadbPageSubstate)[keyof typeof SadbPageSubstate];

export class SadbPageSubstateMachine extends PageSubstateMachine<SadbPageSubstate> {
  constructor() {
    super(PageState.Sadb, SadbPageSubstate.Collapsed);
  }

  expand(): void {
    this.dispatch(SadbPageSubstate.Mirroring);
  }

  collapse(): void {
    this.dispatch(SadbPageSubstate.Collapsed);
  }

  idlePanel(): void {
    this.dispatch(SadbPageSubstate.IdlePanel);
  }

  mirroring(): void {
    this.dispatch(SadbPageSubstate.Mirroring);
  }

  protected override handleAction(action: PageSubstateAction): void {
    if (action.type !== "click") return;
    const { target, event } = action;
    const sadbState = this.getState();

    if (sadbState === SadbPageSubstate.Mirroring) return;
    if (sadbState === SadbPageSubstate.IdlePanel) {
      if (!target.closest("#sadb-status-bar")) return;
      event.stopPropagation();
      debouncedAction(sadbClickTimer, setSadbClickTimer, () => {
        if (isExpandAnimating) return;
        setIsExpandAnimating(true);
        this.collapse();
        void invoke("set_expanded", { expanded: false });
        window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
      });
      return;
    }

    if (
      target.closest("#sadb-btn-start")
      || target.closest("#sadb-btn-stop")
      || target.closest("#sadb-canvas")
    ) return;

    event.stopPropagation();
    debouncedAction(sadbClickTimer, setSadbClickTimer, () => {
      if (isExpandAnimating) return;
      setIsExpandAnimating(true);
      this.idlePanel();
      capsule.classList.add("sadb-idle");
      void invoke("set_expanded", { expanded: false });
      window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
    });
  }
}

export const sadbPageSubstateMachine = new SadbPageSubstateMachine();
