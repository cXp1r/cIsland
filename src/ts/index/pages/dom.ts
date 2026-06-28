import { $ } from "../shared/dom";
import { PageState } from "./types";

export const pagesElements: Record<PageState, HTMLElement> = {
  time: $<HTMLDivElement>("time-area"),
  music: $<HTMLDivElement>("music-area"),
  agent: $<HTMLDivElement>("agent-area"),
  sadb: $<HTMLDivElement>("sadb-area"),
  email: $<HTMLDivElement>("email-area"),
  downloader: $<HTMLDivElement>("downloader-area"),
};
