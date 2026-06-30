export const OverlayPriority = {
  None: -1,
  Privacy: 0,
  Notice: 1,
  Search: 2,
  AgentHandler: 3,
  Tutorial: 4,
} as const;

export type OverlayPriority =
  (typeof OverlayPriority)[keyof typeof OverlayPriority];