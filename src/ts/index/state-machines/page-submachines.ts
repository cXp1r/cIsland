import { ManualPageState, isManualPageState } from "./page";
import { pageSubstateRegistry } from "./page-substates/registry";
import { getPageSubstateInitialState, type PageSubstateDefinition } from "./page-substates";
import { TimePageSubstate } from "./page-substates/time";
import { LyricPageSubstate } from "./page-substates/lyric";
import { AgentPageSubstate } from "./page-substates/agent";
import { SadbPageSubstate } from "./page-substates/sadb";
import { EmailPageSubstate } from "./page-substates/email";
import { DownloaderPageSubstate } from "./page-substates/downloader";

export interface PageSubmachine<S extends string = string> {
  page: ManualPageState;
  definition: PageSubstateDefinition<S>;
  currentState: S;
}

export type PageSubmachineMap = Partial<Record<ManualPageState, PageSubmachine>>;

function createPageSubmachine<S extends string>(
  page: ManualPageState,
  definition: PageSubstateDefinition<S>,
): PageSubmachine<S> {
  return {
    page,
    definition,
    currentState: getPageSubstateInitialState(definition),
  };
}

export function createPageSubmachineMap(): PageSubmachineMap {
  const map: PageSubmachineMap = {};

  (Object.keys(pageSubstateRegistry) as ManualPageState[]).forEach((page) => {
    const definition = pageSubstateRegistry[page];
    if (!definition) return;
    map[page] = createPageSubmachine(page, definition);
  });

  return map;
}

export const pageSubmachineMap = createPageSubmachineMap();

export function getPageSubmachine(
  map: PageSubmachineMap,
  page: ManualPageState,
): PageSubmachine | undefined {
  return map[page];
}

export function getPageSubmachineState(
  map: PageSubmachineMap,
  page: ManualPageState,
): string | undefined {
  return map[page]?.currentState;
}

export function createPageSubmachineKey(page: ManualPageState, state: string): string {
  return `${page}:${state}`;
}

export function getCurrentPageSubmachine(page: ManualPageState): PageSubmachine | undefined {
  return pageSubmachineMap[page];
}

export function getCurrentPageSubmachineState(page: ManualPageState): string | undefined {
  return pageSubmachineMap[page]?.currentState;
}

export function setCurrentPageSubmachineState(page: ManualPageState, state: string): void {
  const machine = pageSubmachineMap[page];
  if (!machine || machine.currentState === state) return;
  machine.currentState = state;
}

function inferCurrentPageSubmachineState(page: ManualPageState, classList: DOMTokenList): string {
  const machine = pageSubmachineMap[page];
  if (!machine) return "";

  switch (page) {
    case ManualPageState.Time:
      return classList.contains("panel-expanded")
        ? TimePageSubstate.Expanded
        : TimePageSubstate.Collapsed;
    case ManualPageState.Lyric:
      if (classList.contains("music-expanded")) return LyricPageSubstate.Expanded;
      return machine.currentState === LyricPageSubstate.Seeking
        ? machine.currentState
        : LyricPageSubstate.Collapsed;
    case ManualPageState.Agent:
      if (classList.contains("agent-expanded")) return AgentPageSubstate.Expanded;
      return machine.currentState === AgentPageSubstate.Thinking
        || machine.currentState === AgentPageSubstate.Generating
        ? machine.currentState
        : AgentPageSubstate.Collapsed;
    case ManualPageState.Sadb:
      if (classList.contains("sadb-expanded")) return SadbPageSubstate.Mirroring;
      if (classList.contains("sadb-idle")) return SadbPageSubstate.IdlePanel;
      return machine.currentState;
    case ManualPageState.Email:
      if (classList.contains("email-expanded")) return EmailPageSubstate.Expanded;
      return machine.currentState === EmailPageSubstate.Dragging
        ? machine.currentState
        : EmailPageSubstate.Collapsed;
    case ManualPageState.Downloader:
      if (classList.contains("downloader-expanded")) return DownloaderPageSubstate.Expanded;
      return machine.currentState === DownloaderPageSubstate.Downloading
        ? machine.currentState
        : DownloaderPageSubstate.Collapsed;
    default:
      return machine.currentState;
  }
}

export function syncCurrentPageSubmachineStateFromClassList(
  page: ManualPageState,
  classList: DOMTokenList,
): string | undefined {
  if (!isManualPageState(page)) return undefined;

  const nextState = inferCurrentPageSubmachineState(page, classList);
  if (nextState) {
    setCurrentPageSubmachineState(page, nextState);
  }
  return nextState || undefined;
}
