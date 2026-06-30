import { invoke } from "@tauri-apps/api/core";
import { capsule, viewSwitcher } from "../shell/dom";
import { PageState } from "./types";
import { pageStateMachine } from "./machine";
import { listen } from "@tauri-apps/api/event";
import { initSadbComponents } from "./sadb";
import { initMusicController } from "./music";
import { initTimeController } from "./time";
import { initDownloaderController } from "./downloader";
import { initEmailController } from "./email";
import { logd } from "../../utils/logger";
import { MUSIC_INTERACTIVE_SELECTOR } from "./music/selectors";


export function initPagesController(){
    capsule.addEventListener("click", (event: MouseEvent) => {
        if (pageStateMachine.isDragging) {
            return;
        }
        const target = event.target instanceof Element ? event.target : capsule;
        if (
            target.closest("button")
            || target.closest("input")
            || target.closest("textarea")
            || target.closest("select")
            || target.closest("a")
            || target.closest("[role='button']")
            || target.closest("#tutorial-area")
            || target.closest(MUSIC_INTERACTIVE_SELECTOR)
        ){
            logd("Components", "skip dispatch", target);
            return;
        }
        pageStateMachine.dispatch({
            tag: "click",
            target: target instanceof HTMLElement ? target : capsule,
            event,
        });
    });
    capsule.addEventListener("dblclick", (event: MouseEvent) => {
        const target = event.target instanceof Element ? event.target : capsule;
        if (
            target.closest(".url-item")
            || target.closest("#notice-area")
            || target.closest("#tutorial-area")
            || target.closest(MUSIC_INTERACTIVE_SELECTOR)
            || target.closest(".view-dot")
            || target.closest("#agent-input")
            || target.closest("#agent-send-btn")
            || target.closest("#agent-stop-btn")
            || target.closest("#agent-clear-btn")
            || target.closest("#sadb-btn-start")
            || target.closest("#sadb-btn-stop")
            || target.closest("#sadb-canvas")
            || target.closest("#sadb-resize-handle")
            || target.closest(".downloader-btn")
            ) {
            return;
        }
        event.stopPropagation();
        pageStateMachine.dispatch({
            tag: "dbclick",
            target: target instanceof HTMLElement ? target : capsule,
            event: event,
        });
    });
    capsule.addEventListener("contextmenu", (event: MouseEvent) => {
        event.preventDefault();
        if (
        pageStateMachine.substates[PageState.Agent].state !== "collapsed"
        || pageStateMachine.substates[PageState.Music].state === "expanded"
        ) return;
        if (capsule.classList.contains("privacy-active")) return;
        void invoke("show_context_menu");
    });
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
    listen<boolean>("set-hover", (event) => {
        pageStateMachine.dispatch({
            tag: "hover",
            event: event.payload,
        });
    });
    initTimeController()
    initMusicController();
    initSadbComponents();
    initEmailController();
    initDownloaderController();
}
