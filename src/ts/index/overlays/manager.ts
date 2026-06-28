import { OverlayPriority } from "./priority";
import type { OverlayId } from "./types";

export class OverlayManager {
  state: OverlayId = "idle";
  priority: OverlayPriority = OverlayPriority.None;

  request(id: OverlayId, priority: OverlayPriority): boolean {
    if (!this.canEnter(priority)) return false;

    this.state = id;
    this.priority = priority;
    this.emitChange();
    return true;
  }

  release(id: OverlayId): boolean {
    if (this.state !== id) return false;

    this.state = "idle";
    this.priority = OverlayPriority.None;
    this.emitChange();
    return true;
  }

  canEnter(priority: OverlayPriority): boolean {
    return this.priority <= priority;
  }

  private emitChange(): void {
    document.dispatchEvent(new CustomEvent("overlay-changed", {
      detail: {
        state: this.state,
        priority: this.priority,
      },
    }));
  }
}

export const overlayManager = new OverlayManager();

