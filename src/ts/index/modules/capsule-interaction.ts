import { capsule } from "../dom";
import { currentView, dragStarted, setDragStarted, panelClickTimer, setPanelClickTimer, musicClickTimer, setMusicClickTimer, agentClickTimer, setAgentClickTimer, sadbClickTimer, setSadbClickTimer, downloaderClickTimer, setDownloaderClickTimer, emailClickTimer, setEmailClickTimer } from "../state";
import { switchToNextView } from "./view-switcher";
import { showContextMenu } from "./drag";
import { logd } from "../logger";
import { PageState } from "../state-machines/page";
import { overlayStateMachine } from "../state-machines/overlay-machine";
import { pageStateMachine } from "../state-machines/page-machine";
import { type PageSubstateAction } from "../state-machines/page-substates/common";

function clearClickTimers(): void {
  [panelClickTimer, agentClickTimer, musicClickTimer, sadbClickTimer, emailClickTimer, downloaderClickTimer]
    .forEach((timer) => timer && clearTimeout(timer));
  setPanelClickTimer(null);
  setAgentClickTimer(null);
  setMusicClickTimer(null);
  setSadbClickTimer(null);
  setEmailClickTimer(null);
  setDownloaderClickTimer(null);
}

function dispatchPageAction(event: MouseEvent): void {
  const page = pageStateMachine.state;
  const submachine = pageStateMachine.getSubmachine(page);
  if (!submachine) return;
  submachine.dispatch({
    type: "click",
    target: event.target instanceof HTMLElement ? event.target : capsule,
    event,
  } satisfies PageSubstateAction);
}

export function initCapsuleInteraction() {
  capsule.addEventListener("click", (event: MouseEvent) => {
    logd("Capsule", `click on view '${currentView}'`);
    if (dragStarted) {
      setDragStarted(false);
      return;
    }

    if (overlayStateMachine.isOccupied()) return;
    dispatchPageAction(event);
  });

  capsule.addEventListener("dblclick", (event: MouseEvent) => {
    logd("Capsule", `double click on view '${currentView}'`);
    const target = event.target as HTMLElement;
    if (
      target.closest(".url-item")
      || target.closest("#notice-area")
      || target.closest(".media-btn")
      || target.closest(".view-dot")
      || target.closest("#agent-input")
      || target.closest("#agent-send-btn")
      || target.closest("#agent-stop-btn")
      || target.closest("#agent-clear-btn")
      || target.closest("#sadb-btn-start")
      || target.closest("#sadb-btn-stop")
      || target.closest("#sadb-canvas")
      || target.closest(".downloader-btn")
    ) {
      return;
    }
    clearClickTimers();
    event.stopPropagation();
    switchToNextView();
  });

  capsule.addEventListener("contextmenu", (event: MouseEvent) => {
    event.preventDefault();
    if (
      pageStateMachine.substates[PageState.Agent].getState() !== "collapsed"
      || pageStateMachine.substates[PageState.Lyric].getState() === "expanded"
    ) return;
    if (capsule.classList.contains("privacy-active")) return;
    showContextMenu();
  });
}
