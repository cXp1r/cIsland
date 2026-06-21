import { capsule } from "../../dom";
import { PageState } from "../page";
import { PageSubstateKind } from "./common";
import { TimePageSubstate } from "./time";
import { LyricPageSubstate } from "./lyric";
import { AgentPageSubstate } from "./agent";
import { SadbPageSubstate } from "./sadb";
import { EmailPageSubstate } from "./email";
import { DownloaderPageSubstate } from "./downloader";

type ClassEffect = {
  add?: string[];
  remove?: string[];
};

export interface SubstateBridge<S extends string = string> {
  readonly page: PageState;
  readonly kind: typeof PageSubstateKind[keyof typeof PageSubstateKind];
  getState(): S;
  setState(state: S): void;
  getPageClasses(): string;
  savePageClasses(classList: DOMTokenList): string;
  applyPageClasses(classList: DOMTokenList): string;
  expand(): void;
  collapse(): void;
}

interface SubstateBridgeConfig<S extends string> {
  page: PageState;
  kind: typeof PageSubstateKind[keyof typeof PageSubstateKind];
  initialState: S;
  defaultClassSnapshot?: string;
  expandState: S;
  collapseState: S;
  expandEffect?: ClassEffect;
  collapseEffect?: ClassEffect;
  stateEffects?: Partial<Record<S, ClassEffect>>;
}

abstract class SubstateBridgeBase<S extends string> implements SubstateBridge<S> {
  public readonly page: PageState;
  public readonly kind: typeof PageSubstateKind[keyof typeof PageSubstateKind];
  protected readonly expandState: S;
  protected readonly collapseState: S;
  protected readonly defaultClassSnapshot: string;
  protected readonly expandEffect?: ClassEffect;
  protected readonly collapseEffect?: ClassEffect;
  protected readonly stateEffects: Partial<Record<S, ClassEffect>>;
  protected currentState: S;
  protected classSnapshot: string;

  constructor(config: SubstateBridgeConfig<S>) {
    this.page = config.page;
    this.kind = config.kind;
    this.expandState = config.expandState;
    this.collapseState = config.collapseState;
    this.defaultClassSnapshot = config.defaultClassSnapshot ?? "";
    this.expandEffect = config.expandEffect;
    this.collapseEffect = config.collapseEffect;
    this.stateEffects = config.stateEffects ?? {};
    this.currentState = config.initialState;
    this.classSnapshot = this.defaultClassSnapshot;
  }

  protected applyEffect(effect?: ClassEffect): void {
    if (!effect) return;
    if (effect.remove?.length) {
      capsule.classList.remove(...effect.remove);
    }
    if (effect.add?.length) {
      capsule.classList.add(...effect.add);
    }
  }

  protected commit(state: S): void {
    this.currentState = state;
  }

  getState(): S {
    return this.currentState;
  }

  setState(state: S): void {
    if (this.currentState === state) return;
    this.applyEffect(this.stateEffects[state]);
    this.commit(state);
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

  expand(): void {
    this.applyEffect(this.expandEffect);
    this.commit(this.expandState);
  }

  collapse(): void {
    this.applyEffect(this.collapseEffect);
    this.commit(this.collapseState);
  }
}

export interface TimeSubstateBridge extends SubstateBridge<TimePageSubstate> {}

export interface LyricSubstateBridge extends SubstateBridge<LyricPageSubstate> {
  seeking(): void;
}

export interface AgentSubstateBridge extends SubstateBridge<AgentPageSubstate> {
  thinking(): void;
  generating(): void;
}

export interface SadbSubstateBridge extends SubstateBridge<SadbPageSubstate> {
  idlePanel(): void;
  mirroring(): void;
}

export interface EmailSubstateBridge extends SubstateBridge<EmailPageSubstate> {
  dragging(): void;
}

export interface DownloaderSubstateBridge extends SubstateBridge<DownloaderPageSubstate> {
  downloading(): void;
}

export class TimeSubstateBridgeImpl extends SubstateBridgeBase<TimePageSubstate> implements TimeSubstateBridge {
  constructor() {
    super({
      page: PageState.Time,
      kind: PageSubstateKind.Time,
      initialState: TimePageSubstate.Collapsed,
      defaultClassSnapshot: "",
      expandState: TimePageSubstate.Expanded,
      collapseState: TimePageSubstate.Collapsed,
      expandEffect: { add: ["panel-expanded"] },
      collapseEffect: { remove: ["panel-expanded"] },
      stateEffects: {
        [TimePageSubstate.Collapsed]: { remove: ["panel-expanded"] },
        [TimePageSubstate.Expanded]: { add: ["panel-expanded"] },
      },
    });
  }
}

export class LyricSubstateBridgeImpl extends SubstateBridgeBase<LyricPageSubstate> implements LyricSubstateBridge {
  constructor() {
    super({
      page: PageState.Lyric,
      kind: PageSubstateKind.Lyric,
      initialState: LyricPageSubstate.Collapsed,
      defaultClassSnapshot: "lyric-collapsed",
      expandState: LyricPageSubstate.Expanded,
      collapseState: LyricPageSubstate.Collapsed,
      expandEffect: { add: ["music-expanded"] },
      collapseEffect: { remove: ["music-expanded"] },
      stateEffects: {
        [LyricPageSubstate.Collapsed]: { remove: ["music-expanded"] },
        [LyricPageSubstate.Expanded]: { add: ["music-expanded"] },
      },
    });
  }

  seeking(): void {
    this.setState(LyricPageSubstate.Seeking);
  }
}

export class AgentSubstateBridgeImpl extends SubstateBridgeBase<AgentPageSubstate> implements AgentSubstateBridge {
  constructor() {
    super({
      page: PageState.Agent,
      kind: PageSubstateKind.Agent,
      initialState: AgentPageSubstate.Collapsed,
      defaultClassSnapshot: "",
      expandState: AgentPageSubstate.Expanded,
      collapseState: AgentPageSubstate.Collapsed,
      expandEffect: { add: ["agent-expanded"] },
      collapseEffect: { remove: ["agent-expanded"] },
      stateEffects: {
        [AgentPageSubstate.Collapsed]: {
          remove: ["agent-expanded", "agent-thinking", "agent-generating", "agent-idle", "agent-error"],
        },
        [AgentPageSubstate.Expanded]: {
          add: ["agent-expanded"],
          remove: ["agent-thinking", "agent-generating", "agent-idle", "agent-error"],
        },
        [AgentPageSubstate.Thinking]: {
          add: ["agent-thinking"],
          remove: ["agent-generating", "agent-idle", "agent-error"],
        },
        [AgentPageSubstate.Generating]: {
          add: ["agent-generating"],
          remove: ["agent-thinking", "agent-idle", "agent-error"],
        },
      },
    });
  }

  thinking(): void {
    this.setState(AgentPageSubstate.Thinking);
  }

  generating(): void {
    this.setState(AgentPageSubstate.Generating);
  }
}

export class SadbSubstateBridgeImpl extends SubstateBridgeBase<SadbPageSubstate> implements SadbSubstateBridge {
  constructor() {
    super({
      page: PageState.Sadb,
      kind: PageSubstateKind.Sadb,
      initialState: SadbPageSubstate.Collapsed,
      defaultClassSnapshot: "",
      expandState: SadbPageSubstate.Mirroring,
      collapseState: SadbPageSubstate.Collapsed,
      expandEffect: { add: ["sadb-expanded"], remove: ["sadb-idle"] },
      collapseEffect: { remove: ["sadb-expanded", "sadb-idle"] },
      stateEffects: {
        [SadbPageSubstate.Collapsed]: { remove: ["sadb-expanded", "sadb-idle"] },
        [SadbPageSubstate.IdlePanel]: { add: ["sadb-idle"], remove: ["sadb-expanded"] },
        [SadbPageSubstate.Mirroring]: { add: ["sadb-expanded"], remove: ["sadb-idle"] },
      },
    });
  }

  idlePanel(): void {
    this.setState(SadbPageSubstate.IdlePanel);
  }

  mirroring(): void {
    this.setState(SadbPageSubstate.Mirroring);
  }
}

export class EmailSubstateBridgeImpl extends SubstateBridgeBase<EmailPageSubstate> implements EmailSubstateBridge {
  constructor() {
    super({
      page: PageState.Email,
      kind: PageSubstateKind.Email,
      initialState: EmailPageSubstate.Collapsed,
      defaultClassSnapshot: "",
      expandState: EmailPageSubstate.Expanded,
      collapseState: EmailPageSubstate.Collapsed,
      expandEffect: { add: ["email-expanded"] },
      collapseEffect: { remove: ["email-expanded"] },
      stateEffects: {
        [EmailPageSubstate.Collapsed]: { remove: ["email-expanded"] },
        [EmailPageSubstate.Expanded]: { add: ["email-expanded"] },
      },
    });
  }

  dragging(): void {
    this.setState(EmailPageSubstate.Dragging);
  }
}

export class DownloaderSubstateBridgeImpl
  extends SubstateBridgeBase<DownloaderPageSubstate>
  implements DownloaderSubstateBridge
{
  constructor() {
    super({
      page: PageState.Downloader,
      kind: PageSubstateKind.Downloader,
      initialState: DownloaderPageSubstate.Collapsed,
      defaultClassSnapshot: "",
      expandState: DownloaderPageSubstate.Expanded,
      collapseState: DownloaderPageSubstate.Collapsed,
      expandEffect: { add: ["downloader-expanded"] },
      collapseEffect: { remove: ["downloader-expanded"] },
      stateEffects: {
        [DownloaderPageSubstate.Collapsed]: { remove: ["downloader-expanded"] },
        [DownloaderPageSubstate.Expanded]: { add: ["downloader-expanded"] },
      },
    });
  }

  downloading(): void {
    this.setState(DownloaderPageSubstate.Downloading);
  }
}
