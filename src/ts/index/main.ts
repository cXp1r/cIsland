import { invoke } from "@tauri-apps/api/core";
import { initPageRenders } from "./renderers/pages";
import { initPageStateMachine } from "./states";
import { initComponents } from "./components";

initPageStateMachine();
initPageRenders();
initComponents();
invoke('set_capsule_current_rect', {width: 140, height: 50})