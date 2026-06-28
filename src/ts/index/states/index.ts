import { PageStateMachine } from "./pages";
import { OverlayStateMachine } from "./overlays";

export const overlayStateMachine = new OverlayStateMachine();
export const pageStateMachine = new PageStateMachine();

export function initPageStateMachine() {
    //从core获取用户配置的分页顺序等操作
}