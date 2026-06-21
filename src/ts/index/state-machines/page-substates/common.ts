import type { ManualPageState } from "../page";

export const PageSubstateKind = {
  Time: "time",
  Lyric: "lyric",
  Agent: "agent",
  Sadb: "sadb",
  Email: "email",
  Downloader: "downloader",
} as const;

export type PageSubstateKind = (typeof PageSubstateKind)[keyof typeof PageSubstateKind];

export interface PageSubstateDefinition<S extends string = string> {
  kind: PageSubstateKind;
  initialState: S;
  states: readonly S[];
}

export type PageSubstateRegistry = Partial<Record<ManualPageState, PageSubstateDefinition>>;

export function definePageSubstate<S extends string>(definition: PageSubstateDefinition<S>) {
  return definition;
}

export function createPageSubstateRegistry(
  entries: Array<{ page: ManualPageState; definition: PageSubstateDefinition }>,
): PageSubstateRegistry {
  const registry: PageSubstateRegistry = {};
  for (const entry of entries) {
    registry[entry.page] = entry.definition;
  }
  return registry;
}

export function getPageSubstateInitialState<S extends string>(
  definition: PageSubstateDefinition<S>,
): S {
  return definition.initialState;
}
