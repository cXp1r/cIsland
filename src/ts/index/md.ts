import { marked } from "marked";
import katex from "katex";
// @ts-ignore
import "katex/dist/katex.min.css";
import { hljs } from "./highlight-setup";

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

export function renderMarkdown(text: string): string {
  const mathBlocks: string[] = [];
  const placeholder = (i: number) => `%%MATH_BLOCK_${i}%%`;

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

  try {
    let html = marked.parse(processed, { async: false }) as string;

    mathBlocks.forEach((rendered, i) => {
      html = html.replace(placeholder(i), rendered);
    });

    return html;
  } catch {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  }
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

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
