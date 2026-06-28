import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export const agentHandlerOverlayModule: OverlayRequest = {
  id: "agent-handler",
  priority: OverlayPriority.AgentHandler,
};

