import type { ManualPageState } from "./page";

export const PageSubstateKind = {
  Time: "time",
  Lyric: "lyric",
  Agent: "agent",
  Sadb: "sadb",
  Email: "email",
  Downloader: "downloader",
} as const;

export type PageSubstateKind = (typeof PageSubstateKind)[keyof typeof PageSubstateKind];

export interface BasePageSubstate<S extends string = string> {
  kind: PageSubstateKind;
  state: S;
}

export interface PageSubstateDefinition<S extends string = string> {
  kind: PageSubstateKind;
  initialState: S;
  states: readonly S[];
}

export interface PageSubstateRegistryEntry<S extends string = string> {
  page: ManualPageState;
  definition: PageSubstateDefinition<S>;
}

export type PageSubstateRegistry = Partial<Record<ManualPageState, PageSubstateDefinition>>;

export function definePageSubstate<S extends string>(definition: PageSubstateDefinition<S>) {
  return definition;
}

export function createPageSubstateRegistry(
  entries: Array<PageSubstateRegistryEntry>,
): PageSubstateRegistry {
  const registry: PageSubstateRegistry = {};
  for (const entry of entries) {
    registry[entry.page] = entry.definition;
  }
  return registry;
}

export function getPageSubstateDefinition(
  registry: PageSubstateRegistry,
  page: ManualPageState,
): PageSubstateDefinition | undefined {
  return registry[page];
}

export function getPageSubstateInitialState<S extends string>(
  definition: PageSubstateDefinition<S>,
): S {
  return definition.initialState;
}

export function hasPageSubstateDefinition(
  registry: PageSubstateRegistry,
  page: ManualPageState,
): boolean {
  return registry[page] != null;
}
