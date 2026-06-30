import { initOverlays } from "./overlays";
import { initPages } from "./pages";
import { initShell } from "./shell";
import { showTutorial } from "./overlays/tutorial";

initPages();
initOverlays();
initShell();

window.setTimeout(() => {
  showTutorial();
}, 0);
