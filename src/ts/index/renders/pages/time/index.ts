import { initTimeExpanded } from "./expanded";
import { initTimeCollapsed } from "./collapsed";
import type { TimePageSubstate } from "../../../states/pages/page-substates";

export function initTimeRenders() {
  initTimeCollapsed();
  initTimeExpanded();
}

export function handleTimeSubstateTransition(
  _from: TimePageSubstate,
  _to: TimePageSubstate,
): void {
  // Time 页目前没有额外的子状态渲染，专属分发留在这里给后续扩展。
}
