import { capsule } from "../../../doms/dom";
import type { DispatchAction, PageState } from "../page";

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

  protected transitionTo(nextState: S): void {
    this.state = nextState;
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
      this.timer == null;
      return;
    }
    this.timer = window.setTimeout(() => {
      this.timer == null;
      action();
    }, delayMs);
  }
}

