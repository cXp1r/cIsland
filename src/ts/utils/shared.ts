import { loge } from "./logger";

export const $ = <T extends HTMLElement>(id: string): T => {
  let e = document.getElementById(id);
  if (!e) {
    loge("$", id)
  }
  return e as T
};