import { PageState } from "../types";
import type { PageModule } from "../types";
import { initTimeController } from "./controller";
import { initTimeRenderers } from "./renderer";

export const timePageModule: PageModule = {
  id: PageState.Time,
  initController: initTimeController,
  initRenderer: initTimeRenderers,
};

export { timePageSubstateMachine } from "./machine";
export { timeList } from "./renderer";
export { initTimeController, initTimeRenderers };
