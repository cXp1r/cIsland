import { PageState } from "../types";
import type { PageModule } from "../types";
import { initSadbComponents } from "./controller";

export const sadbPageModule: PageModule = {
  id: PageState.Sadb,
  initController: initSadbComponents,
};

export { createSadbChannel, invalidateSadbSession } from "./canvas-renderer";
export { initSadbComponents } from "./controller";
export { sadbPageSubstateMachine } from "./machine";
export { sadbList } from "./renderer";
