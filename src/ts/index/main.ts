import { invoke } from "@tauri-apps/api/core";
import { initOverlays } from "./overlays";
import { initPages } from "./pages";
import { initShell } from "./shell";
import { showTutorial } from "./overlays/tutorial";

initPages();
initOverlays();
initShell();

window.setTimeout(async () => {
  if (await invoke<boolean>("should_show_tutorial")) {
    showTutorial();
  }
}, 0);
