import { initShellDrag } from "./drag";
import { initShellRenderer } from "./renderer";

export function initShell(): void {
  initShellRenderer();
  initShellDrag();
}
