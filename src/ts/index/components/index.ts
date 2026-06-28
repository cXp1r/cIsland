import { initDragger } from "./drag";
import { initOverlaysComponents } from "./overlays";
import { initPagesComponents } from "./pages";

export function initComponents() {
    initPagesComponents()
    initOverlaysComponents();
    initDragger();
}