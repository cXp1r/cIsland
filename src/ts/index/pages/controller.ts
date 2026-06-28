import { invoke } from "@tauri-apps/api/core";
import { capsule, viewSwitcher } from "../shell/dom";
import { PageState } from "./types";
import { pageStateMachine } from "./machine";
import { listen } from "@tauri-apps/api/event";
import { initSadbComponents } from "./sadb";
import { initTimeController } from "./time";
import { initDownloaderController } from "./downloader";
import { initEmailController } from "./email";
import { logd } from "../../utils/logger";


export function initPagesController(){
    capsule.addEventListener("click", (event: MouseEvent) => {
        if (pageStateMachine.isDragging) {
            return;
        }
        const target = event.target instanceof HTMLElement ? event.target : capsule;
        if (event instanceof HTMLButtonElement || event instanceof HTMLInputElement){
            logd("Components", "skip dispatch", target)
        }
        pageStateMachine.dispatch({
            tag: "click",
            target,
            event,
        });
    });
    capsule.addEventListener("dblclick", (event: MouseEvent) => {
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
            || target.closest("#sadb-resize-handle")
            || target.closest(".downloader-btn")
            ) {
            return;
        }
        event.stopPropagation();
        pageStateMachine.dispatch({
            tag: "dbclick",
            target: event.target instanceof HTMLElement ? event.target : capsule,
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
    initSadbComponents();
    initEmailController();
    initDownloaderController();
}
