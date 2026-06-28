import { initDragger } from "./drag";
import { initOverlaysC } from "./overlays";
import { initPagesComponents } from "./pages";

export function initComponents() {
    initPagesComponents()
    initOverlaysC();
    initDragger();
}