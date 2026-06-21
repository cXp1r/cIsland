import { capsule } from "../../dom";
import type { PageState } from "../page";

type ClassEffect = {
  add?: string[];
  remove?: string[];
};

export type PageSubstateClickAction = {
  type: "click";
  target: HTMLElement;
  event: MouseEvent;
};

export type PageSubstateAction = PageSubstateClickAction;

export abstract class PageSubstateMachine<S extends string = string> {
  public readonly page: PageState;
  protected state: S;
  protected classSnapshot: string;

  constructor(page: PageState, initialState: S, defaultClassSnapshot = "") {
    this.page = page;
    this.state = initialState;
    this.classSnapshot = defaultClassSnapshot;
  }

  protected applyEffect(effect?: ClassEffect): void {
    if (!effect) return;
    if (effect.remove?.length) capsule.classList.remove(...effect.remove);
    if (effect.add?.length) capsule.classList.add(...effect.add);
  }

  protected commit(nextState: S): void {
    this.state = nextState;
  }

  protected handleAction(_action: PageSubstateAction): void {}

  getState(): S {
    return this.state;
  }

  dispatch(nextState: S): void;
  dispatch(action: PageSubstateAction): void;
  dispatch(value: S | PageSubstateAction): void {
    if (typeof value === "string") {
      this.commit(value);
      return;
    }
    this.handleAction(value);
  }

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
}

export function debouncedAction(
  timer: number | null,
  setTimer: (v: number | null) => void,
  action: () => void,
  delayMs = 250,
): void {
  if (timer) {
    clearTimeout(timer);
    setTimer(null);
    return;
  }

  setTimer(window.setTimeout(() => {
    setTimer(null);
    action();
  }, delayMs));
}
