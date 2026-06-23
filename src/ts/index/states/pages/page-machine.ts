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
        this.switchToNextView();
        break;

      case "chosen":
        setView(this.state, action.target);
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
  
  switchToNextView(direction: 1 | -1 = 1) {
    let i = PageStateOrder.indexOf(this.state);
    let n = direction == 1 ? i + 1 == PageStateOrder.length ? 0 : i + 1 : i == 0 ? PageStateOrder.length - 1  : 0;
    setView(this.state, PageStateOrder[n]);
  }

  transitionTo(next: PageState) {
    if (next == this.state) return;
    this.state = next;
  }
}




export const pageStateMachine = new PageStateMachine();