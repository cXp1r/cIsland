import { ManualPageState } from "../page";
import { timePageSubstateDefinition } from "./time";
import { lyricPageSubstateDefinition } from "./lyric";
import { agentPageSubstateDefinition } from "./agent";
import { sadbPageSubstateDefinition } from "./sadb";
import { emailPageSubstateDefinition } from "./email";
import { downloaderPageSubstateDefinition } from "./downloader";
import { createPageSubstateRegistry, type PageSubstateRegistry } from "./common";

export const pageSubstateRegistry: PageSubstateRegistry = createPageSubstateRegistry([
  { page: ManualPageState.Time, definition: timePageSubstateDefinition },
  { page: ManualPageState.Lyric, definition: lyricPageSubstateDefinition },
  { page: ManualPageState.Agent, definition: agentPageSubstateDefinition },
  { page: ManualPageState.Sadb, definition: sadbPageSubstateDefinition },
  { page: ManualPageState.Email, definition: emailPageSubstateDefinition },
  { page: ManualPageState.Downloader, definition: downloaderPageSubstateDefinition },
]);
