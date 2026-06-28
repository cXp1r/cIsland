import { initAgentHandler } from "./agent-handler";
import { initNoticeQueue, initNoticeUrl } from "./notice";
import { initSearchComponents } from "./search";

export function initOverlaysController(): void {
  initSearchComponents();
  initAgentHandler();
  initNoticeQueue();
  initNoticeUrl();
}
