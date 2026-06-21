import { PageState } from "../page";
import { timePageSubstateMachine } from "./time";
import { lyricPageSubstateMachine } from "./lyric";
import { agentPageSubstateMachine } from "./agent";
import { sadbPageSubstateMachine } from "./sadb";
import { emailPageSubstateMachine } from "./email";
import { downloaderPageSubstateMachine } from "./downloader";

export const pageSubstateRegistry = {
  [PageState.Time]: timePageSubstateMachine,
  [PageState.Lyric]: lyricPageSubstateMachine,
  [PageState.Agent]: agentPageSubstateMachine,
  [PageState.Sadb]: sadbPageSubstateMachine,
  [PageState.Email]: emailPageSubstateMachine,
  [PageState.Downloader]: downloaderPageSubstateMachine,
} as const;
