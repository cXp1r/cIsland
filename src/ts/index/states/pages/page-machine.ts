import { DispatchAction, PageState, PageStateOrder } from "./page";
import { pageSubstateRegistry, type PageSubstateMachine } from "./page-substates";
import { setView } from "../../renders/pages";



export type PageSubmachine = PageSubstateMachine;

export class PageStateMachine {
  state: PageState = PageState.Time;
  lastState: PageState = PageState.Time;
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
        let i1 = PageStateOrder.indexOf(this.state);
        let n1 = i1 + 1 == PageStateOrder.length ? 0 : i1 + 1 ;
        this.transitionTo(PageStateOrder[n1]);
        break;

      case "chosen":
        this.transitionTo(PageStateOrder[n]);
        break;

      case "wheel":
        let i = PageStateOrder.indexOf(this.state);
        let n = action.target == 1 ? i + 1 == PageStateOrder.length ? 0 : i + 1 : i == 0 ? PageStateOrder.length - 1 : 0;
        this.transitionTo(PageStateOrder[n]);
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

  transitionTo(next: PageState) {
    if (next == this.state) return;
    this.state = next;
  }
}




export const pageStateMachine = new PageStateMachine();