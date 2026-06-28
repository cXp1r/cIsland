import { OverlayPriority } from "../priority";
import type { OverlayRequest } from "../types";
export { activateSearch, dismissSearch, initSearchComponents } from "./controller";

export const searchOverlayModule: OverlayRequest = {
  id: "search",
  priority: OverlayPriority.Search,
};
