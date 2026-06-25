import { DispatchAction, PageState } from "./page";
import { pageSubstateRegistry, type PageSubstateMachine } from "./page-substates";
import { setView } from "../../renders/pages";
import { logi } from "../../../utils/logger";

export type PageSubmachine = PageSubstateMachine;

export class PageStateMachine {
  state: PageState = PageState.Time;
  isHover: boolean = false;
  isDragging: boolean = false;
  order = [
    PageState.Time,
    PageState.Music,
    PageState.Agent,
    PageState.Sadb,
    PageState.Email,
    PageState.Downloader,
  ];

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
    let n = direction == 1 ? i + 1 == this.order.length ? 0 : i + 1 : i == 0 ? this.order.length - 1 : 0;
    return this.order[n];
  }
}




