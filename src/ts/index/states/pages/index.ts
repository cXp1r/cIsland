import { DispatchAction, PageState } from "./page";
import { setView } from "../../renderers/pages";
import { logi } from "../../../utils/logger";
import { listen } from "@tauri-apps/api/event";


import { timePageSubstateMachine } from "./page-substates/time";
import { lyricPageSubstateMachine } from "./page-substates/music";
import { agentPageSubstateMachine } from "./page-substates/agent";
import { sadbPageSubstateMachine } from "./page-substates/sadb";
import { emailPageSubstateMachine } from "./page-substates/email";
import { downloaderPageSubstateMachine } from "./page-substates/downloader";
import { invoke } from "@tauri-apps/api/core";

interface cInfo {
  agent: boolean,
  sadb: boolean,
  email: boolean,
  downloader: boolean,
}

export class PageStateMachine {
  state: PageState = PageState.Time;
  isHover: boolean = false;
  isDragging: boolean = false;
  private musicPageOffTimer: number | null = null;
  //下次从配置获取显示顺序
  order = [
    PageState.Time,
    PageState.Music,
    PageState.Agent,
    PageState.Sadb,
    PageState.Email,
    PageState.Downloader,
  ];
  

  constructor() {
    //agent已经4个版本没修过了, 需要一个强大的帮手来帮助我
    this.order.splice(1, 2);
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
    invoke<cInfo>("get_configured").then((e) => {
      this.agent.isConfigured = e.agent;
      this.sadb.isConfigured = e.sadb;
      this.email.isConfigured = e.email;
      this.downloader.isConfigured = e.downloader;
      console.log(e);
    })
  }

  

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

  readonly time = timePageSubstateMachine;
  readonly music = lyricPageSubstateMachine;
  readonly agent = agentPageSubstateMachine;
  readonly sadb = sadbPageSubstateMachine;
  readonly email = emailPageSubstateMachine;
  readonly downloader = downloaderPageSubstateMachine;

  //TODO 有空的时候把substates private一下去把复杂读取明确time的给处理一下
  readonly substates = {
    [PageState.Time]: this.time,
    [PageState.Music]: this.music,
    [PageState.Agent]: this.agent,
    [PageState.Sadb]: this.sadb,
    [PageState.Email]: this.email,
    [PageState.Downloader]: this.downloader,
  } as const;
}
