import { pagesElements } from "./dom";
import { PageState } from "./types";
import {
  capsule,
  currentViewContainer,
  viewDots,
  viewHolder,
  viewSwitcher,
} from "../shell/dom";
import { pageStateMachine } from "./machine";
import { initTimeRenderers, timeList } from "./time";
import { animateCapsule } from "../utils/rAF";
import { initMusicRenderers, musicList } from "./music";
import { agentList } from "./agent";
import { sadbList } from "./sadb";
import { emailList } from "./email";
import { downloaderList } from "./downloader";
import { initEmailRenderers } from "./email";

// 页面子状态尺寸/样式配置。
type MaybeFn<T> = [T, T] | (() => [T, T]);
export type Size = MaybeFn<number>;

export type sc = {
  classList: string[] | null;
  size: Size;
};

const r = (v: MaybeFn<number>) => typeof v === "function" ? v() : v;

const handlers: Record<string, Record<string, sc>> = {};

function renderByState(page: string, to: string): void {
  const list = handlers[page]?.[to];
  if (!list) return;

  capsule.className = "";
  const classlist = list.classList;
  if (classlist) {
    console.log(classlist);
    capsule.classList.add(...classlist);
  }

  if (pageStateMachine.isHover) {
    capsule.classList.add("hover");
    if (to == "collapsed") {
      animateCapsule(page === "music" ? 380 : 330, 74);
      return;
    }
  } 
  const [w, h] = r(list.size);
  if (w != -1) {
    animateCapsule(w, h);
  }
  
  
  
}

function renderCurrentPageState(): void {
  const page = pageStateMachine.state;
  const substate = pageStateMachine.substates[page];
  renderByState(page, substate.state);
  if (!substate.isConfigured) {
    capsule.classList.add("unconfigured");
  }
}

function initPageSubstateRenderers(): void {
  handlers["time"] = timeList;
  handlers["music"] = musicList;
  handlers["agent"] = agentList;
  handlers["sadb"] = sadbList;
  handlers["email"] = emailList;
  handlers["downloader"] = downloaderList;
  Object.values(pageStateMachine.substates).forEach((machine) => {
    machine.onTransition = (_from: string, to: string) => {
      renderByState(machine.page, to);
      if (!machine.isConfigured) {
        capsule.classList.add("unconfigured");
      }
    };
  });
}

export function setView(f: PageState, t: PageState) {
  const fromEl = pagesElements[f];
  const toEl = pagesElements[t];
  if (fromEl && fromEl.parentElement === currentViewContainer) {
    fromEl.getAnimations().forEach((a) => a.cancel());
    const outAnim = fromEl.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-8px) scale(0.985)" },
      ],
      { duration: 160, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    outAnim.onfinish = () => {
      fromEl.style.opacity = "";
      fromEl.style.transform = "";

      if (fromEl.parentElement === currentViewContainer) {
        viewHolder.appendChild(fromEl);
      }
    };
  }

  if (toEl.parentElement !== currentViewContainer) {
    currentViewContainer.appendChild(toEl);
    toEl.style.display = "flex";
  }
  toEl.getAnimations().forEach((a) => a.cancel());
  const inAnim = toEl.animate(
    [
      { opacity: 0, transform: "translateY(8px) scale(0.985)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    { duration: 230, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" },
  );
  inAnim.onfinish = () => {
    toEl.style.opacity = "";
    toEl.style.transform = "";
  };
  updateSwitcherUI();
  const page = pageStateMachine.state;
  renderByState(page, pageStateMachine.substates[page].state);
}

export function updateSwitcherUI() {
  viewDots.innerHTML = "";
  if (pageStateMachine.order.length <= 1) {
    viewSwitcher.className = "";
    return;
  }

  viewSwitcher.classList.toggle("has-views", true);
  pageStateMachine.order.forEach((v) => {
    const dot = document.createElement("div");
    dot.className = "view-dot" + (v === pageStateMachine.state ? " active" : "");
    dot.title = v === "time"
      ? "Time View"
      : v === "music"
        ? "Lyric View"
        : v === "agent"
          ? "Agent"
          : v === "sadb"
            ? "ADB"
            : v === "email"
              ? "Email"
              : "Downloader";
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      pageStateMachine.dispatch({
        tag: "chosen",
        target: v,
      });
    });
    viewDots.appendChild(dot);
  });
}

export function mountView(view: PageState) {
  const el = pagesElements[view];

  if (el.parentElement !== currentViewContainer) {
    currentViewContainer.appendChild(el);
  }

  el.style.display = "flex";
  updateSwitcherUI();
}

export function initPagesRenderer() {
  mountView(PageState.Time);
  initPageSubstateRenderers();
  initTimeRenderers();
  initMusicRenderers();
  initEmailRenderers();

  pageStateMachine.onTransition = (from: PageState, to: PageState) => {
    setView(from, to);
  };

  pageStateMachine.onHover = (isHover: boolean) => {
    const page = pageStateMachine.state;
    if (isHover) {
      capsule.classList.add("hover");
      const rect = capsule.getBoundingClientRect();
      const minWidth = page === "music" ? 380 : 330;
      animateCapsule(Math.max(rect.width || 0, minWidth), Math.max(rect.height || 0, 74));
    } else {
      capsule.classList.remove("hover");
      renderByState(page, pageStateMachine.substates[page].state);
    }
  };

  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (e.detail.state !== "idle") return;
    renderCurrentPageState();
  }) as EventListener);
}
