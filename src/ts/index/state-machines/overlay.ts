export const OverlayType = {
  None: "none",
  Search: "search",
  Notice: "notice",
  Privacy: "privacy",
} as const;

export type OverlayType = (typeof OverlayType)[keyof typeof OverlayType];

export const OverlayPriority = {
  None: -1,
  Search: 1,
  Notice: 2,
  Privacy: 3,
} as const;

export type OverlayPriority = (typeof OverlayPriority)[keyof typeof OverlayPriority];

export const OverlayMachineState = {
  Idle: "idle",
  Occupied: "occupied",
} as const;

export type OverlayMachineState = (typeof OverlayMachineState)[keyof typeof OverlayMachineState];

export function canPreempt(incoming: OverlayPriority, current: OverlayPriority): boolean {
  return incoming > current;
}

export function isOverlayOccupied(priority: OverlayPriority): boolean {
  return priority !== OverlayPriority.None;
}

