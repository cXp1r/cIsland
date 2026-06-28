import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { capsule } from "../../../doms";
import { loge } from "../../../../utils/logger";

import { animateHeight } from "../../../utils/rAF";
import { $ } from "../../../../utils/shared";
import { overlayStateMachine } from "../../../states";


export const searchInput = $<HTMLInputElement>("search-input");
export const searchResults = $<HTMLDivElement>("search-results");
export const searchPrevBtn = $<HTMLButtonElement>("search-prev-btn");
export const searchNextBtn = $<HTMLButtonElement>("search-next-btn");
export const searchPageLabel = $<HTMLSpanElement>("search-page-label");

const TAG = "Search";



interface SearchResult {
  id: string;
  title: string;
  desc: string;
  icon: string;
  action: string;
}

interface SearchQueryResponse {
  items: SearchResult[];
  has_next: boolean;
}


let activeIndex = -1;
let results: SearchResult[] = [];
let debounceTimer: number | null = null;
let dismissSyncTimer: number | null = null;
const DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;
let currentQuery = "";
let currentOffset = 0;
let hasNextPage = false;
let searchRequestId = 0;
const SEARCH_PRIORITY = 1;



const BODY_PAD = 5; 

function syncSearchWindowHeight() {
  requestAnimationFrame(() => {
    let h: number;
    if (capsule.classList.contains("search-expanded")) {
      
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--search-expanded-h");
      h = parseFloat(raw) || capsule.offsetHeight;
    } else {
      h = capsule.offsetHeight;
    }
    animateHeight(h + BODY_PAD + 2);
  });
}

function updatePagination() {
  const visible = currentQuery.length > 0 && (results.length > 0 || currentOffset > 0);
  searchPrevBtn.hidden = !visible;
  searchNextBtn.hidden = !visible;
  searchPageLabel.hidden = !visible;
  searchPageLabel.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1}`;
  searchPrevBtn.disabled = currentOffset === 0;
  searchNextBtn.disabled = !hasNextPage;
}

function resetSearchPagination() {
  currentQuery = "";
  currentOffset = 0;
  hasNextPage = false;
  updatePagination();
}

async function fetchSearchPage(query: string, offset: number) {
  const trimmed = query.trim();
  if (!trimmed) {
    searchRequestId += 1;
    resetSearchPagination();
    renderResults([], 0, false);
    return;
  }

  currentQuery = trimmed;
  currentOffset = offset;
  hasNextPage = false;
  updatePagination();

  const requestId = ++searchRequestId;

  try {
    const res = await invoke<SearchQueryResponse>("search_query", {
      query: trimmed,
      offset,
      count: PAGE_SIZE,
    });
    if (requestId !== searchRequestId || trimmed !== currentQuery) {
      return;
    }
    renderResults(res.items, offset, res.has_next);
  } catch (err: any) {
    if (requestId !== searchRequestId || trimmed !== currentQuery) {
      return;
    }
    const errStr = String(err);
    loge(TAG, "search_query failed:", errStr, err);
    renderError(errStr);
  }
}





function renderResults(items: SearchResult[], offset = 0, nextPageAvailable = false) {
  results = items;
  activeIndex = items.length > 0 ? 0 : -1;
  currentOffset = offset;
  hasNextPage = nextPageAvailable;
  searchResults.innerHTML = "";
  updatePagination();

  if (items.length === 0) {
    capsule.classList.remove("search-expanded");
    capsule.classList.add("search-active");
    syncSearchWindowHeight();
    return;
  }

  capsule.classList.remove("search-active");
  capsule.classList.add("search-expanded");

  items.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "search-result-item" + (i === 0 ? " active" : "") + (item.desc ? " has-desc" : "");

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
      selectResult(i);
    });
    searchResults.appendChild(el);
  });
  syncSearchWindowHeight();
}

function renderError(msg: string) {
  results = [];
  activeIndex = -1;
  hasNextPage = false;
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
  syncSearchWindowHeight();
}




function selectResult(index: number) {
  if (index < 0 || index >= results.length) return;
  const item = results[index];
  void invoke("search_execute", { id: item.id, action: item.action });
  dismissSearch();
}

function updateActiveHighlight() {
  const items = searchResults.querySelectorAll(".search-result-item");
  items.forEach((el, i) => {
    el.classList.toggle("active", i === activeIndex);
  });
  const activeEl = items[activeIndex] as HTMLElement | undefined;
  activeEl?.scrollIntoView({ block: "nearest" });
}



function doSearch(query: string) {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!query.trim()) {
    void fetchSearchPage("", 0);
    return;
  }
  debounceTimer = window.setTimeout(async () => {
    debounceTimer = null;
    void fetchSearchPage(query, 0);
  }, DEBOUNCE_MS);
}



export function activateSearch() {
  overlayStateMachine.set(SEARCH_PRIORITY, "search");

  capsule.classList.remove("expanded", "lyric-collapsed", "agent-expanded", "music-expanded", "search-expanded", "email-expanded");
  capsule.classList.add("search-active");

  searchRequestId += 1;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  searchInput.value = "";
  searchResults.innerHTML = "";
  results = [];
  activeIndex = -1;
  resetSearchPagination();
  searchInput.focus();
  
  setTimeout(() => searchInput.focus(), 50);
}

export function dismissSearch() {
  
  overlayStateMachine.free("search");
  searchRequestId += 1;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  searchInput.value = "";
  searchInput.blur();
  searchResults.innerHTML = "";
  results = [];
  activeIndex = -1;
  resetSearchPagination();
  capsule.classList.remove("search-active", "search-expanded");
  
  if (dismissSyncTimer !== null) clearTimeout(dismissSyncTimer);
  dismissSyncTimer = window.setTimeout(() => {
    dismissSyncTimer = null;
    syncSearchWindowHeight();
  }, 360);
}



export function initSearchComponents() {
  
  searchInput.addEventListener("input", () => {
    doSearch(searchInput.value);
  });

  [searchPrevBtn, searchNextBtn].forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
  });

  searchPrevBtn.addEventListener("click", () => {
    if (!currentQuery || currentOffset === 0) return;
    void fetchSearchPage(currentQuery, Math.max(0, currentOffset - PAGE_SIZE));
    searchInput.focus();
  });

  searchNextBtn.addEventListener("click", () => {
    if (!currentQuery || !hasNextPage) return;
    void fetchSearchPage(currentQuery, currentOffset + PAGE_SIZE);
    searchInput.focus();
  });

  
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.code === "Space") {
      e.preventDefault();
    }
  }, true);

  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      dismissSearch();
    }
  }, true);

  
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        activeIndex = (activeIndex + 1) % results.length;
        updateActiveHighlight();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        activeIndex = (activeIndex - 1 + results.length) % results.length;
        updateActiveHighlight();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        selectResult(activeIndex);
      }
      return;
    }
  });

  


  listen("activate-search", () => {
    if (overlayStateMachine.state == "search") {
      dismissSearch();
      capsule.classList.remove("search");
    } else {
      activateSearch();
      capsule.classList.add("search");
    }
  });

  // todo 这啥玩意等会查一下旧代码
  document.addEventListener("overlay-changed", ((_e: CustomEvent) => {
    if (overlayStateMachine.state == "search") {
      dismissSearch();
      capsule.classList.remove("search");
    }
  }) as EventListener);

  
  listen<SearchResult[]>("search-results", (event) => {
    if (overlayStateMachine.state == "search") {
      renderResults(event.payload);
    }
  });
}
