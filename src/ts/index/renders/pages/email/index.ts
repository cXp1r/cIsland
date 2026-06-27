import { sc } from "..";

export const emailList: Record<string, sc> = {
  "collapsed": {
    classList: null,
    size: [140, 50],
  },
  "expanded": {
    classList: ["email-expanded"],
    size: () => {
        const style = getComputedStyle(document.documentElement);
        return [parseInt(style.getPropertyValue('--email-view-w')), parseInt(style.getPropertyValue('--email-view-h'))]
    },
  },
};
