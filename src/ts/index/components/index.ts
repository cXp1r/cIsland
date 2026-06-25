import { initDragger } from "./drag";
import { initPagesComponents } from "./pages";

export function initComponents() {
    initPagesComponents()
    initDragger();
}