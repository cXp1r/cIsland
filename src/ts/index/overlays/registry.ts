import { agentHandlerOverlayModule } from "./agent-handler";
import { noticeOverlayModule } from "./notice";
import { privacyOverlayModule } from "./privacy";
import { searchOverlayModule } from "./search";
import type { OverlayRequest } from "./types";

export const overlayModules: readonly OverlayRequest[] = [
  privacyOverlayModule,
  noticeOverlayModule,
  searchOverlayModule,
  agentHandlerOverlayModule,
];

