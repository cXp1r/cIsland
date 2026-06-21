import { invoke } from "@tauri-apps/api/core";
import {
  capsule,
  vinylCover,
  musicPanelCoverImg, musicPanelSong, musicPanelArtist,
} from "../dom";
import {
  currentView,
  dragStarted, setDragStarted,
  panelClickTimer, setPanelClickTimer,
  musicClickTimer, setMusicClickTimer,
  agentClickTimer, setAgentClickTimer,
  sadbClickTimer, setSadbClickTimer,
  downloaderClickTimer, setDownloaderClickTimer,
  isExpandAnimating, setIsExpandAnimating,
  currentSongTitle, currentArtistName, currentThumbnailUrl,
  emailClickTimer,
  setEmailClickTimer,
} from "../state";
import { switchToNextView } from "./view-switcher";
import { fetchAndUpdateVolume } from "./music-controls";
import { showContextMenu } from "./drag";
import { logd } from "../logger";
import { PageState } from "../state-machines/page";
import { overlayStateMachine } from "../state-machines/overlay-machine";
import { pageStateMachine } from "../state-machines/page-machine";
import { AgentPageSubstate } from "../state-machines/page-substates/agent";
import { SadbPageSubstate } from "../state-machines/page-substates/sadb";

function debouncedClick(
  timer: number | null,
  setTimer: (v: number | null) => void,
  action: () => void,
  delayMs: number = 250,
): void {
  if (timer) {
    clearTimeout(timer);
    setTimer(null);
    return;
  }
  setTimer(window.setTimeout(() => {
    setTimer(null);
    action();
  }, delayMs));
}

export function initCapsuleInteraction() {
  capsule.addEventListener("click", (e: MouseEvent) => {
    logd("Capsule",`click on view '${currentView}'`);
    const target = e.target as HTMLElement;
    console.log(target);
    // 濡傛灉鍒氬垰鍙戠敓浜嗘嫋鍔紝涓嶈Е鍙戠偣�?
    if (dragStarted) {
      setDragStarted(false);
      return;
    }

    // 鏈夊脊灞傦紙search / notice / privacy锛夋椂锛屼笉瑙﹀彂鍒嗛〉鐐瑰嚮閫昏�?
    if (overlayStateMachine.isOccupied()) return;

    const page = pageStateMachine.state;
    switch (page) {
      case PageState.Time: {
        e.stopPropagation();
        debouncedClick(panelClickTimer, setPanelClickTimer, () => {
        if (pageStateMachine.substates[PageState.Time].getState() === "expanded"
              && target instanceof HTMLDivElement) {
          pageStateMachine.substates[PageState.Time].collapse();
          void invoke("set_expanded", { expanded: false });
        } else {
          pageStateMachine.substates[PageState.Time].expand();
          void invoke("set_expanded", { expanded: true });
        }
        });
        break;
      }
      case PageState.Lyric: {
        if (pageStateMachine.substates[PageState.Lyric].getState() === "expanded") {
          if (!target.closest("#music-panel-header")) return;
        } else {
          if (target.closest(".media-btn") || target.closest(".progress-bar")
              || target.closest(".vol-btn")) return;
        }
        e.stopPropagation();
        debouncedClick(musicClickTimer, setMusicClickTimer, () => {
          if (isExpandAnimating) return;
          setIsExpandAnimating(true);
          if (pageStateMachine.substates[PageState.Lyric].getState() !== "expanded") {
            musicPanelSong.textContent = currentSongTitle || "";
            musicPanelArtist.textContent = currentArtistName || "";
            if (currentThumbnailUrl) {
              vinylCover.style.backgroundImage = `url(${currentThumbnailUrl})`;
              musicPanelCoverImg.style.backgroundImage = `url(${currentThumbnailUrl})`;
            }
            fetchAndUpdateVolume();
            pageStateMachine.substates[PageState.Lyric].expand();
            void invoke("set_expanded", { expanded: true });
            window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
          } else {
            pageStateMachine.substates[PageState.Lyric].collapse();
            void invoke("set_expanded", { expanded: false });
            window.setTimeout(() => { setIsExpandAnimating(false); }, 500);
          }
        });
        break;
      }
      case PageState.Agent: {
        const agentSt = pageStateMachine.substates[PageState.Agent].getState();
        if (agentSt !== AgentPageSubstate.Collapsed) {
          if (!target.closest("#agent-status-bar") || target.closest("#agent-clear-btn")) return;
        } else {
          if (target.closest("#agent-input") || target.closest("#agent-send-btn")
              || target.closest("#agent-stop-btn") || target.closest("#agent-clear-btn")
              || target.closest(".thinking-section") || target.closest("#agent-messages")
              || target.closest("#agent-confirm-dialog")) return;
        }
        e.stopPropagation();
        debouncedClick(agentClickTimer, setAgentClickTimer, () => {
          if (isExpandAnimating) return;
          setIsExpandAnimating(true);
          if (pageStateMachine.substates[PageState.Agent].getState() === "collapsed") {
            pageStateMachine.substates[PageState.Agent].expand();
            void invoke("set_expanded", { expanded: true });
            window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
          } else {
            const agentArea = document.getElementById("agent-area");
            if (agentArea) agentArea.classList.add("collapsing");
            window.setTimeout(() => {
              pageStateMachine.substates[PageState.Agent].collapse();
              void invoke("set_expanded", { expanded: false });
              window.setTimeout(() => {
                if (agentArea) agentArea.classList.remove("collapsing");
                setIsExpandAnimating(false);
              }, 50);
            }, 100);
          }
        });
        break;
      }
      case PageState.Sadb: {
        const sadbSt = pageStateMachine.substates[PageState.Sadb].getState();
        switch (sadbSt) {
          case SadbPageSubstate.Mirroring:
            break;
          case SadbPageSubstate.IdlePanel:
            if (!target.closest("#sadb-status-bar")) return;
            e.stopPropagation();
            debouncedClick(sadbClickTimer, setSadbClickTimer, () => {
              if (isExpandAnimating) return;
              setIsExpandAnimating(true);
              pageStateMachine.substates[PageState.Sadb].collapse();
              void invoke("set_expanded", { expanded: false });
              window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
            });
            break;
          default:
            if (target.closest("#sadb-btn-start") || target.closest("#sadb-btn-stop")
                || target.closest("#sadb-canvas")) return;
            e.stopPropagation();
            debouncedClick(sadbClickTimer, setSadbClickTimer, () => {
              if (isExpandAnimating) return;
              setIsExpandAnimating(true);
              pageStateMachine.substates[PageState.Sadb].idlePanel();
              void invoke("set_expanded", { expanded: false });
              window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
            });
            break;
        }
        break;
      }
      case PageState.Email: {
        debouncedClick(emailClickTimer, setEmailClickTimer, () => {
          if (pageStateMachine.substates[PageState.Email].getState() === "expanded") {
            pageStateMachine.substates[PageState.Email].collapse();
            void invoke("set_expanded", { expanded: false });
          } else {
            pageStateMachine.substates[PageState.Email].expand();
            void invoke("set_expanded", { expanded: true });
          }
        });
        break;
      }
      case PageState.Downloader: {
        if (!(target instanceof HTMLDivElement)) return;
        e.stopPropagation();
        debouncedClick(downloaderClickTimer, setDownloaderClickTimer, () => {
          if (isExpandAnimating) return;
          setIsExpandAnimating(true);
          if (pageStateMachine.substates[PageState.Downloader].getState() === "collapsed") {
            pageStateMachine.substates[PageState.Downloader].expand();
            void invoke("set_expanded", { expanded: true });
            window.setTimeout(() => { setIsExpandAnimating(false); }, 400);
          } else {
            window.setTimeout(() => {
              pageStateMachine.substates[PageState.Downloader].collapse();
              void invoke("set_expanded", { expanded: false });
              window.setTimeout(() => {
                setIsExpandAnimating(false);
              }, 50);
            }, 100);
          }
        });
        break;
      }
      default:
        break;
    }
  });
  capsule.addEventListener("dblclick", (e: MouseEvent) => {
    logd("Capsule",`double click on view '${currentView}'`);
    const target = e.target as HTMLElement;
    if (target.closest(".url-item") || target.closest("#notice-area") || target.closest(".media-btn") || target.closest(".view-dot") || target.closest("#agent-input") || target.closest("#agent-send-btn") || target.closest("#agent-stop-btn") || target.closest("#agent-clear-btn") || target.closest("#sadb-btn-start") || target.closest("#sadb-btn-stop") || target.closest("#sadb-canvas") || target.closest(".downloader-btn")) {
      return;
    }
    [panelClickTimer, agentClickTimer, musicClickTimer, sadbClickTimer, emailClickTimer, downloaderClickTimer]
      .forEach(t => t && clearTimeout(t));
    setPanelClickTimer(null);
    setAgentClickTimer(null);
    setMusicClickTimer(null);
    setSadbClickTimer(null);
    setEmailClickTimer(null);
    setDownloaderClickTimer(null);
    e.stopPropagation();
    switchToNextView();
  });
  // 鍙抽敭鑿滃崟鍔熻�?
  capsule.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault();
    // Agent 闈炴敹璧锋€併€丩yric 灞曞紑鎬佹椂涓嶆樉绀鸿彍�?
    if (pageStateMachine.substates[PageState.Agent].getState() !== "collapsed"
        || pageStateMachine.substates[PageState.Lyric].getState() === "expanded") return;
    // 闅愮寮圭獥鏄剧ず鏃朵笉鏄剧ず鑿滃崟锛堥殣绉侀潪鎵嬪姩椤甸潰锛屾棤鐘舵€佹満鏉＄洰锛屼繚�?classList 鍒ゆ柇锛?
    if (capsule.classList.contains("privacy-active")) return;
    // 鏄剧ず绯荤粺鑿滃�?
    showContextMenu();
  });
}
