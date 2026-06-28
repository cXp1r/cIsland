import { agentPageModule } from "./agent";
import { downloaderPageModule } from "./downloader";
import { emailPageModule } from "./email";
import { musicPageModule } from "./music";
import { sadbPageModule } from "./sadb";
import { timePageModule } from "./time";
import type { PageModule } from "./types";

export const pageModules: readonly PageModule[] = [
  timePageModule,
  musicPageModule,
  agentPageModule,
  sadbPageModule,
  emailPageModule,
  downloaderPageModule,
];

