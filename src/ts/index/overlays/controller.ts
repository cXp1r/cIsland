import { initAgentHandler } from "./agent-handler";
import { initNoticeQueue, initNoticeUrl } from "./notice";
import { initPrivacy } from "./privacy";
import { initSearchComponents } from "./search";

export function initOverlaysController(): void {
  initSearchComponents();
  initAgentHandler();
  initNoticeQueue();
  initNoticeUrl();
  initPrivacy();
}
