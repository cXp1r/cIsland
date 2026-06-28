export type OverlayId =
  | "idle"
  | "search"
  | "notice"
  | "privacy"
  | "agent-handler";

export type OverlayRequest = {
  id: OverlayId;
  priority: number;
};

