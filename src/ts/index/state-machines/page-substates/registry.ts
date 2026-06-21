import { PageState } from "../page";
import { timePageSubstateDefinition } from "./time";
import { lyricPageSubstateDefinition } from "./lyric";
import { agentPageSubstateDefinition } from "./agent";
import { sadbPageSubstateDefinition } from "./sadb";
import { emailPageSubstateDefinition } from "./email";
import { downloaderPageSubstateDefinition } from "./downloader";
import { createPageSubstateRegistry, type PageSubstateRegistry } from "./common";

export const pageSubstateRegistry: PageSubstateRegistry = createPageSubstateRegistry([
  { page: PageState.Time, definition: timePageSubstateDefinition },
  { page: PageState.Lyric, definition: lyricPageSubstateDefinition },
  { page: PageState.Agent, definition: agentPageSubstateDefinition },
  { page: PageState.Sadb, definition: sadbPageSubstateDefinition },
  { page: PageState.Email, definition: emailPageSubstateDefinition },
  { page: PageState.Downloader, definition: downloaderPageSubstateDefinition },
]);
