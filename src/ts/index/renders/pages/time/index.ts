import { initTimeExpanded } from "./expanded";
import { initTimeCollapsed } from "./collapsed";
import { sc } from "..";

export function initTimeRenders() {
  initTimeCollapsed();
  initTimeExpanded();
}

export const timeList: Record<string, sc> = {
  "collapsed": {
    classList: [],
    size: [140, 50],
  },
  "expanded": {
    classList: ["expanded"],
    size: [700, 200],
  },
};