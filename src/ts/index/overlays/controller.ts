import { initAgentHandler } from "./agent-handler";
import { initNoticeQueue, initNoticeUrl } from "./notice";
import { initPrivacy } from "./privacy";
import { initSearchComponents } from "./search";
import { initTutorialOverlay } from "./tutorial";

export function initOverlaysController(): void {
  initSearchComponents();
  initAgentHandler();
  initNoticeQueue();
  initNoticeUrl();
  initPrivacy();
  initTutorialOverlay();
}
