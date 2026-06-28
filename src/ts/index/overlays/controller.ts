import { initAgentHandler } from "./agent-handler";
import { initSearchComponents } from "./search";

export function initOverlaysController(): void {
  initSearchComponents();
  initAgentHandler();
}
