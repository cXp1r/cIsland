import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { logi } from "../../utils/logger";
import {
  PageEventType,
  PageState,
  PageTransitionSource,
  resolveNextAvailablePage,
} from "./types";
import type { DispatchAction } from "./types";
import { agentPageSubstateMachine } from "./agent/machine";
import { downloaderPageSubstateMachine } from "./downloader/machine";
import { emailPageSubstateMachine } from "./email/machine";
import { lyricPageSubstateMachine } from "./music/machine";
import { sadbPageSubstateMachine } from "./sadb/machine";
import { timePageSubstateMachine } from "./time/machine";

export {
  PageEventType,
  PageState,
  PageTransitionSource,
  resolveNextAvailablePage,
};
export type { DispatchAction };

type ConfiguredInfo = {
  agent: boolean;
  sadb: boolean;
  email: boolean;
  downloader: boolean;
};

export class PageStateMachine {
  state: PageState = PageState.Time;
  private isFreeze = false;
  isHover = false;
  isDragging = false;
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
    this.order.splice(1, 2);
    document.addEventListener("overlay-changed", ((e: CustomEvent) => {
      this.isFreeze = e.detail.state !== "idle"
      logi("State", "isFreeze", this.isFreeze)
    }) as EventListener);

    listen<boolean>("music-page", (event) => {
      const visible = event.payload;
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
          this.transitionTo(PageState.Time);
        }
      }, 250);
    });

    invoke<ConfiguredInfo>("get_configured").then((e) => {
      this.agent.isConfigured = e.agent;
      this.sadb.isConfigured = e.sadb;
      this.email.isConfigured = e.email;
      this.downloader.isConfigured = e.downloader;
      console.log(e);
    }).catch(() => {});
  }

  readonly time = timePageSubstateMachine;
  readonly music = lyricPageSubstateMachine;
  readonly agent = agentPageSubstateMachine;
  readonly sadb = sadbPageSubstateMachine;
  readonly email = emailPageSubstateMachine;
  readonly downloader = downloaderPageSubstateMachine;

  readonly substates = {
    [PageState.Time]: this.time,
    [PageState.Music]: this.music,
    [PageState.Agent]: this.agent,
    [PageState.Sadb]: this.sadb,
    [PageState.Email]: this.email,
    [PageState.Downloader]: this.downloader,
  } as const;

  onHover?: (isHover: boolean) => void;
  onTransition?: (from: PageState, to: PageState) => void;

  createKey(page: PageState, state: string): string {
    return `${page}:${state}`;
  }

  dispatch(action: DispatchAction): void {
    if (this.isFreeze) return;
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
      case "hover":
        this.isHover = action.event;
        this.onHover?.(this.isHover);
        break;
      case "conditional":
        if (action.event === "downloader") {
          this.transitionTo(PageState.Downloader);
        }
        break;
      case "key":
      case "core":
        break;
    }
  }

  transitionTo(next: PageState): void {
    const from = this.state;
    if (next === from) return;

    this.state = next;
    this.onTransition?.(from, next);
  }

  private toNth(direction: -1 | 1 = 1): PageState {
    const i = this.order.indexOf(this.state);
    const n = direction === 1
      ? (i + 1 === this.order.length ? 0 : i + 1)
      : i === 0 ? this.order.length - 1 : 0;
    return this.order[n];
  }
}

export const pageStateMachine = new PageStateMachine();

export function initPageStateMachine(): void {
  // Reserved for persisted page order/configuration hydration.
}
