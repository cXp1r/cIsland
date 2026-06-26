import { capsule } from "../../../doms";
import type { DispatchAction, PageState } from "../page";

export type PageTransitionListener<S extends string> =
  (from: S, to: S) => void;

export abstract class PageSubstateMachine<S extends string = string> {
  readonly page: PageState;
  state: S;
  protected classSnapshot: string;
  capsule: HTMLDivElement;
  isConfigured: boolean;
  timer: number | null = null;

  constructor(page: PageState, initialState: S, defaultClassSnapshot = "") {
    this.page = page;
    this.state = initialState;
    this.classSnapshot = defaultClassSnapshot;
    this.capsule = capsule;
    this.isConfigured = false;
  }

  onTransition?: PageTransitionListener<S>;

  transitionTo(next: S) {
    const from = this.state;
    if (next === from) return;

    this.state = next;
    this.onTransition?.(from, next);
  }

  abstract dispatch(action: DispatchAction): void;

  getPageClasses(): string {
    return this.classSnapshot;
  }

  savePageClasses(classList: DOMTokenList): string {
    this.classSnapshot = classList.value;
    return this.classSnapshot;
  }

  applyPageClasses(classList: DOMTokenList): string {
    classList.value = this.classSnapshot;
    return this.classSnapshot;
  }

  debouncedAction(
    action: () => void,
    delayMs = 250,
  ): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      return;
    }
    this.timer = window.setTimeout(() => {
      this.timer = null;
      action();
    }, delayMs);
  }
}

