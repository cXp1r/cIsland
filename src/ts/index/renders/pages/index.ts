import { pagesElements, PageState, PageStateOrder, DispatchAction } from "../../states/pages/page";
import {
    capsule,
    currentViewContainer,
    viewHolder,
    viewSwitcher, viewDots,
} from "../../doms/dom";
import { pagesOut } from "../../utils/channels";

import { pageStateMachine, PageStateMachine } from "../../states/pages/page-machine";
export function setView(f: PageState, t: PageState){
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
}


export function updateSwitcherUI() {
  viewDots.innerHTML = "";
  PageStateOrder.forEach((v) => {
    const dot = document.createElement("div");
    dot.className = "view-dot" + (v === pageStateMachine.state ? " active" : "");
    dot.title = v == "time"
      ? "Time View"
      : v == "music"
        ? "Lyric View"
        : v == "agent"
          ? "Agent"
          : v == "sadb"
            ? "ADB"
            : v == "email"
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

export function initPageRenders() {
    viewSwitcher.addEventListener("wheel", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY > 0) {
            pageStateMachine.dispatch({
                tag: "wheel",
                target: 1,
            });
        } else {
            pageStateMachine.dispatch({
                tag: "wheel",
                target: -1,
            });
        }
    }, { passive: false });

    pagesOut.onmessage = (e: MessageEvent) => {
        if (e.data === "page") {
            setView
        }
    };
}

function switchToNextView(lastState: PageState, direction: 1 | -1 = 1) {
    let i = PageStateOrder.indexOf(this.state);
    let n = direction == 1 ? i + 1 == PageStateOrder.length ? 0 : i + 1 : i == 0 ? PageStateOrder.length - 1  : 0;
    setView(lastState, PageStateOrder[n]);
}
