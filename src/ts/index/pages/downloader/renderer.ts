import type { PageRenderSpec } from "../types";

export const downloaderList: Record<string, PageRenderSpec> = {
  collapsed: {
    classList: null,
    size: [140, 50],
  },
  expanded: {
    classList: ["downloader-expanded"],
    size: [400, 300],
  },
  downloading: {
    classList: ["downloader-expanded"],
    size: [400, 300],
  },
};

