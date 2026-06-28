import { PageState } from "../types";
import type { PageModule } from "../types";
import { initDownloaderController } from "./controller";

export const downloaderPageModule: PageModule = {
  id: PageState.Downloader,
  initController: initDownloaderController,
};

export { initDownloaderController, openExternal, showStatus, url } from "./controller";
export { downloaderPageSubstateMachine } from "./machine";
export { downloaderList } from "./renderer";
