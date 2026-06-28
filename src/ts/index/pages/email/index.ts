import { PageState } from "../types";
import type { PageModule } from "../types";
import { initEmailController } from "./controller";
import { initEmailRenderers } from "./renderer";

export const emailPageModule: PageModule = {
  id: PageState.Email,
  initController: initEmailController,
  initRenderer: initEmailRenderers,
};

export {
  applyEmailViewSize,
  getEmailWindowSize,
  initEmailController,
  onEmailViewEntered,
} from "./controller";
export { emailPageSubstateMachine } from "./machine";
export { emailList, initEmailRenderers, showEmbeddedEmailView } from "./renderer";
