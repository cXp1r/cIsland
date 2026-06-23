import { DispatchAction, PageState, PageStateOrder } from "./page";
import { pageSubstateRegistry, type PageSubstateMachine } from "./page-substates";
import { setView } from "../../renders/pages";



export type PageSubmachine = PageSubstateMachine;

export class PageStateMachine {
  state: PageState = PageState.Time;
  isHover: boolean = false;
  isDragging: boolean = false;
  readonly substates = pageSubstateRegistry;

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }

  dispatch(action: DispatchAction): void {
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

      case "system":
        break;

      case "conditional":
        switch (action.event) {
          case "download":
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

  onTransition?: (from: PageState, to: PageState) => void;

  transitionTo(next: PageState) {
    const from = this.state;
    if (next === from) return;

    this.state = next;
    this.onTransition?.(from, next);
  }

  private toNth(direction: -1 | 1 = 1): PageState {
    let i = PageStateOrder.indexOf(this.state);
    let n = direction == 1 ? i + 1 == PageStateOrder.length ? 0 : i + 1 : i == 0 ? PageStateOrder.length - 1 : 0;
    return PageStateOrder[n];
  }
}




export const pageStateMachine = new PageStateMachine();