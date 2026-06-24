import { invoke } from "@tauri-apps/api/core";
import { initPageRenders } from "./renders/pages";
import { initPageStateMachine } from "./states";
import { initComponents } from "./components/pages";

initPageRenders();
initPageStateMachine();
initComponents();
invoke('set_capsule_current_rect', {width: 140, height: 50})