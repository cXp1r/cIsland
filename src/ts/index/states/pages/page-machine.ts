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
  order = [
    PageState.Time,
    PageState.Music,
    PageState.Agent,
    PageState.Sadb,
    PageState.Email,
    PageState.Downloader,
  ];

  constructor() {
    //先给音乐删了
    this.order.splice(1, 1);
    listen<boolean>('music-page', (event) => {
      const b: boolean = event.payload;
      const index = this.order.indexOf(PageState.Music);
      if (!b) {
        if (index !== -1) {
          this.order.splice(index, 1);
          //强制到时间页面
          this.transitionTo(PageState.Time);
        }
      } else {
        if (index === -1) {
          this.order.splice(1, 0, PageState.Music);
          
        }
        //强制到音乐分页
        this.transitionTo(PageState.Music);
        
      }
      
    })
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
    let n = direction == 1 ? i + 1 == this.order.length ? 0 : i + 1 : i == 0 ? this.order.length - 1 : 0;
    return this.order[n];
  }
}




