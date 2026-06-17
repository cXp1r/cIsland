import { marked } from "marked";
import { invoke } from "@tauri-apps/api/core";
import katex from "katex";
// @ts-ignore
import "katex/dist/katex.min.css";
import { hljs } from "./highlight-setup";

const markdownRenderer = new marked.Renderer();
let currentMarkdownCwd = "";

function renderLatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      trust: true,
    });
  } catch {
    return tex;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function normalizeOpenPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("file://")) {
    try {
      const url = new URL(trimmed);
      let pathname = decodeURIComponent(url.pathname);

      if (url.host) {
        return `\\\\${url.host}${pathname.replace(/\//g, "\\")}`;
      }

      if (/^\/[A-Za-z]:/.test(pathname)) {
        pathname = pathname.slice(1);
      }

      return pathname;
    } catch {
      return trimmed;
    }
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function isAbsoluteOpenPath(path: string): boolean {
  return (
    /^\\\\\?\\/.test(path) ||
    /^\\\\/.test(path) ||
    /^\/\//.test(path) ||
    /^[A-Za-z]:[\\/]/.test(path) ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(path)
  );
}

function joinWithCwd(cwd: string, path: string): string {
  const normalizedCwd = cwd.replace(/\//g, "\\").replace(/[\\/]+$/, "");
  const normalizedPath = path.replace(/\//g, "\\").replace(/^[\\/]+/, "");

  if (!normalizedCwd) {
    return normalizedPath;
  }

  if (!normalizedPath) {
    return normalizedCwd;
  }

  return `${normalizedCwd}\\${normalizedPath}`;
}

function stripPathSuffix(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  const lastSlash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  let cutIndex = trimmed.length;

  const hashIndex = trimmed.indexOf("#", lastSlash + 1);
  if (hashIndex >= 0) {
    cutIndex = Math.min(cutIndex, hashIndex);
  }

  const questionIndex = trimmed.indexOf("?", lastSlash + 1);
  if (questionIndex >= 0) {
    cutIndex = Math.min(cutIndex, questionIndex);
  }

  const colonIndex = trimmed.indexOf(":", lastSlash + 1);
  if (colonIndex >= 0 && !(colonIndex === 1 && /^[A-Za-z]:/.test(trimmed))) {
    cutIndex = Math.min(cutIndex, colonIndex);
  }

  return trimmed.slice(0, cutIndex);
}

function resolveMarkdownPath(rawPath: string, cwd: string): string {
  const normalized = normalizeOpenPath(rawPath);
  const cleaned = stripPathSuffix(normalized);

  if (!cleaned) return "";
  if (isAbsoluteOpenPath(cleaned)) return cleaned;
  if (!cwd) return cleaned;

  return joinWithCwd(cwd, cleaned);
}

function getOpenPathLabel(path: string): string {
  if (!path) return "";

  const normalized = path.replace(/[\\/]+$/, "");
  const lastSlash = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

markdownRenderer.link = function ({ href, title, tokens }) {
  const renderedText = this.parser.parseInline(tokens);
  const openPath = normalizeOpenPath(href);
  const label = renderedText.trim() || escapeHtml(getOpenPathLabel(openPath) || "Open path");
  const titleAttr = title
    ? ` title="${escapeHtml(title)}"`
    : openPath
      ? ` title="${escapeHtml(openPath)}"`
      : "";
  const cwdAttr = currentMarkdownCwd ? ` data-cwd="${escapeHtml(currentMarkdownCwd)}"` : "";

  return `<button type="button" class="md-path-btn"${openPath ? ` data-open-path="${escapeHtml(openPath)}"` : ""}${cwdAttr}${titleAttr}${openPath ? "" : ' disabled aria-disabled="true"'}>${label}</button>`;
};

marked.use({
  renderer: markdownRenderer,
});

// cwd是agent渲染md时候用的
export function renderMarkdown(text: string, cwd = ""): string {
  const mathBlocks: string[] = [];
  const placeholder = (i: number) => `%%MATH_BLOCK_${i}%%`;

  currentMarkdownCwd = cwd;

  try {
    let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
      const idx = mathBlocks.length;
      mathBlocks.push(renderLatex(tex.trim(), true));
      return placeholder(idx);
    });

    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => {
      const idx = mathBlocks.length;
      mathBlocks.push(renderLatex(tex.trim(), true));
      return placeholder(idx);
    });

    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => {
      const idx = mathBlocks.length;
      mathBlocks.push(renderLatex(tex.trim(), false));
      return placeholder(idx);
    });

    processed = processed.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, (_, tex) => {
      const idx = mathBlocks.length;
      mathBlocks.push(renderLatex(tex.trim(), false));
      return placeholder(idx);
    });

    let html = marked.parse(processed, { async: false }) as string;

    mathBlocks.forEach((rendered, i) => {
      html = html.replace(placeholder(i), rendered);
    });

    return html;
  } catch {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  } finally {
    currentMarkdownCwd = "";
  }
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function bindMarkdownButtons(container: HTMLElement) {
  container.querySelectorAll<HTMLButtonElement>("button.md-path-btn").forEach((button) => {
    if (button.dataset.boundOpenPath === "true") return;
    button.dataset.boundOpenPath = "true";

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const path = button.dataset.openPath || "";
      if (!path) return;

      const cwd = button.dataset.cwd || button.closest<HTMLElement>("[data-cwd]")?.dataset.cwd || "";
      const resolvedPath = resolveMarkdownPath(path, cwd);

      void invoke("open_path", { path: resolvedPath, select: true });
    });
  });
}

export function highlightAndAddCopyButtons(container: HTMLElement) {
  container.querySelectorAll("pre code").forEach((block) => {
    try {
      hljs.highlightElement(block as HTMLElement);
    } catch {
      /* ignore */
    }

    const pre = block.parentElement;
    if (pre && !pre.querySelector(".code-copy-btn")) {
      const btn = document.createElement("button");
      btn.className = "code-copy-btn";
      btn.textContent = "Copy";

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const code = block.textContent || "";

        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "Copied";
          btn.classList.add("copied");

          setTimeout(() => {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 1500);
        });
      });

      pre.style.position = "relative";
      pre.appendChild(btn);
    }
  });
}
