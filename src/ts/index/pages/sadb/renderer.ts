import type { PageRenderSpec } from "../types";

export const sadbList: Record<string, PageRenderSpec> = {
  collapsed: {
    classList: null,
    size: [140, 50],
  },
  idle: {
    classList: ["sadb-idle"],
    size: [400, 440],
  },
  mirroring: {
    classList: ["sadb-expanded"],
    size: [-1, -1],
  },
};

