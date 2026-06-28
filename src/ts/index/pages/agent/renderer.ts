import type { PageRenderSpec } from "../types";

export const agentList: Record<string, PageRenderSpec> = {
  collapsed: {
    classList: null,
    size: [140, 50],
  },
  expanded: {
    classList: ["agent-expanded"],
    size: [380, 420],
  },
  thinking: {
    classList: ["agent-expanded"],
    size: [380, 420],
  },
  generating: {
    classList: ["agent-expanded"],
    size: [380, 420],
  },
};

