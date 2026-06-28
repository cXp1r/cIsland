import { PageState } from "../types";
import type { PageModule } from "../types";

export const agentPageModule: PageModule = {
  id: PageState.Agent,
};

export { agentPageSubstateMachine } from "./machine";
export { agentList } from "./renderer";
