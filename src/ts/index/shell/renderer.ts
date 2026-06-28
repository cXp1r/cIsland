import { invoke } from "@tauri-apps/api/core";

export function initShellRenderer(): void {
  void invoke("set_capsule_current_rect", { width: 140, height: 50 });
}
