export type OverlayId =
  | "idle"
  | "search"
  | "notice"
  | "privacy"
  | "agent-handler"
  | "tutorial";

export type OverlayRequest = {
  id: OverlayId;
  priority: number;
};