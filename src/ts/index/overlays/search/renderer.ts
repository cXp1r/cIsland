import { capsule } from "../../shell/dom";
import { animateCapsule } from "../../utils/rAF";
import {
  searchNextBtn,
  searchPageLabel,
  searchPrevBtn,
  searchResults,
} from "./dom";

const PAGE_SIZE = 10;
const BODY_PAD = 5;

export interface SearchResult {
  id: string;
  title: string;
  desc: string;
  icon: string;
  action: string;
}

function cssPx(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseFloat(raw) || fallback;
}

export function syncSearchWindowSize(): void {
  requestAnimationFrame(() => {
    const w = cssPx("--search-w", capsule.offsetWidth || 420);
    let h: number;
    if (capsule.classList.contains("search-expanded")) {
      h = cssPx("--search-expanded-h", capsule.offsetHeight || 430);
    } else {
      h = cssPx("--search-h", capsule.offsetHeight || 50);
    }
    animateCapsule(w, h + BODY_PAD + 2);
  });
}

export function updateSearchPagination(
  query: string,
  resultCount: number,
  offset: number,
  hasNextPage: boolean,
): void {
  const visible = query.length > 0 && (resultCount > 0 || offset > 0);
  searchPrevBtn.hidden = !visible;
  searchNextBtn.hidden = !visible;
  searchPageLabel.hidden = !visible;
  searchPageLabel.textContent = `Page ${Math.floor(offset / PAGE_SIZE) + 1}`;
  searchPrevBtn.disabled = offset === 0;
  searchNextBtn.disabled = !hasNextPage;
}

export function renderSearchResults(
  items: SearchResult[],
  activeIndex: number,
  onSelect: (index: number) => void,
): void {
  searchResults.innerHTML = "";

  if (items.length === 0) {
    capsule.classList.remove("search-expanded");
    capsule.classList.add("search-active");
    syncSearchWindowSize();
    return;
  }

  capsule.classList.remove("search-active");
  capsule.classList.add("search-expanded");

  items.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "search-result-item" + (i === activeIndex ? " active" : "") + (item.desc ? " has-desc" : "");

    const icon = document.createElement("div");
    icon.className = "search-result-icon";
    icon.textContent = item.icon || "*";

    const text = document.createElement("div");
    text.className = "search-result-text";

    const title = document.createElement("div");
    title.className = "search-result-title";
    title.textContent = item.title;
    text.appendChild(title);

    if (item.desc) {
      const desc = document.createElement("div");
      desc.className = "search-result-desc";
      desc.textContent = item.desc;
      text.appendChild(desc);
    }

    el.appendChild(icon);
    el.appendChild(text);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect(i);
    });
    searchResults.appendChild(el);
  });

  syncSearchWindowSize();
}

export function renderSearchError(msg: string): void {
  searchResults.innerHTML = "";
  searchPrevBtn.hidden = true;
  searchNextBtn.hidden = true;
  searchPageLabel.hidden = true;

  capsule.classList.remove("search-active");
  capsule.classList.add("search-expanded");

  const el = document.createElement("div");
  el.className = "search-error-hint";
  el.textContent = msg;
  searchResults.appendChild(el);
  syncSearchWindowSize();
}

export function updateSearchActiveHighlight(activeIndex: number): void {
  const items = searchResults.querySelectorAll(".search-result-item");
  items.forEach((el, i) => {
    el.classList.toggle("active", i === activeIndex);
  });
  const activeEl = items[activeIndex] as HTMLElement | undefined;
  activeEl?.scrollIntoView({ block: "nearest" });
}
