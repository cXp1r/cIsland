import { DispatchAction, PageState } from "./page";
import { pageSubstateRegistry, type PageSubstateMachine } from "./page-substates";
import { setView } from "../../renders/pages";
import { logi } from "../../../utils/logger";
import { listen } from "@tauri-apps/api/event";

export type PageSubmachine = PageSubstateMachine;

export class PageStateMachine {
  state: PageState = PageState.Time;
  isHover: boolean = false;
  isDragging: boolean = false;
  private musicPageOffTimer: number | null = null;
  order = [
    PageState.Time,
    PageState.Music,
    PageState.Agent,
    PageState.Sadb,
    PageState.Email,
    PageState.Downloader,
  ];

  constructor() {
    // Start without the music page until playback confirms it should be shown.
    this.order.splice(1, 1);
    listen<boolean>("music-page", (event) => {
      const visible: boolean = event.payload;
      const index = this.order.indexOf(PageState.Music);

      if (visible) {
        if (this.musicPageOffTimer !== null) {
          clearTimeout(this.musicPageOffTimer);
          this.musicPageOffTimer = null;
        }
        if (index === -1) {
          this.order.splice(1, 0, PageState.Music);
          // Force to the music page once playback is confirmed.
          this.transitionTo(PageState.Music);
        }
        return;
      }

      if (this.musicPageOffTimer !== null) clearTimeout(this.musicPageOffTimer);
      this.musicPageOffTimer = window.setTimeout(() => {
        this.musicPageOffTimer = null;
        const currentIndex = this.order.indexOf(PageState.Music);
        if (currentIndex !== -1) {
          this.order.splice(currentIndex, 1);
          // Force back to the time page only after the off-state is stable.
          this.transitionTo(PageState.Time);
        }
      }, 250);
    });
  }

  readonly substates = pageSubstateRegistry;

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }

  dispatch(action: DispatchAction): void {
    logi("pageStateMachine", action);
    switch (action.tag) {
      case "click":
        this.substates[this.state].dispatch(action);
        break;

      case "dbclick":
        this.transitionTo(this.toNth());
        break;

      case "chosen":
        this.transitionTo(action.target);
        break;

      case "wheel":
        this.transitionTo(this.toNth(action.target));
        break;

      case "key":
        break;

      case "hover":
        this.isHover = action.event;
        this.onHover?.(this.isHover);
        break;

      case "conditional":
        switch (action.event) {
          case "downloader":
            setView(this.state, PageState.Downloader);
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
  }

  onHover?: (isHover: boolean) => void;

  onTransition?: (from: PageState, to: PageState) => void;

  transitionTo(next: PageState) {
    const from = this.state;
    if (next === from) return;

    this.state = next;
    this.onTransition?.(from, next);
  }

  private toNth(direction: -1 | 1 = 1): PageState {
    let i = this.order.indexOf(this.state);
    let n = direction == 1 ? (i + 1 == this.order.length ? 0 : i + 1) : i == 0 ? this.order.length - 1 : 0;
    return this.order[n];
  }
}
