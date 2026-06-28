import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";

export { initAgentHandler, respondToHook, hideAllCards } from "./controller";
export {
  createApprovalCard,
  createNotification,
  createQuestionCard,
  createStopCard,
} from "./renderer";

export type {
  CcDirective,
  CcHookData,
  CcHookEvent,
  CcPermBehavior,
  CcPermMode,
  CcPermReqResp,
  CcPermRule,
  CcPermUpdate,
  CcPreToolUseResp,
  HookAction,
  HookRequest,
  HookResponse,
} from "./model";

export const agentHandlerOverlayModule: OverlayRequest = {
  id: "agent-handler",
  priority: OverlayPriority.AgentHandler,
};
