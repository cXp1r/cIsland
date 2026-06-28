import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { loge } from "../../../utils/logger";
import { capsule } from "../../shell/dom";
import { overlayManager } from "../manager";
import { OverlayPriority } from "../priority";
import {
  searchInput,
  searchNextBtn,
  searchPrevBtn,
  searchResults,
} from "./dom";
import {
  renderSearchError,
  renderSearchResults,
  syncSearchWindowHeight,
  type SearchResult,
  updateSearchActiveHighlight,
  updateSearchPagination,
} from "./renderer";

const TAG = "Search";
const DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;

interface SearchQueryResponse {
  items: SearchResult[];
  has_next: boolean;
}

let activeIndex = -1;
let results: SearchResult[] = [];
let debounceTimer: number | null = null;
let dismissSyncTimer: number | null = null;
let currentQuery = "";
let currentOffset = 0;
let hasNextPage = false;
let searchRequestId = 0;

function updatePagination() {
  updateSearchPagination(currentQuery, results.length, currentOffset, hasNextPage);
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
  updatePagination();
  renderSearchResults(items, activeIndex, selectResult);
}

function renderError(msg: string) {
  results = [];
  activeIndex = -1;
  hasNextPage = false;
  renderSearchError(msg);
}

function selectResult(index: number) {
  if (index < 0 || index >= results.length) return;
  const item = results[index];
  void invoke("search_execute", { id: item.id, action: item.action });
  dismissSearch();
}

function updateActiveHighlight() {
  updateSearchActiveHighlight(activeIndex);
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
  overlayManager.request("search", OverlayPriority.Search);

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
  overlayManager.release("search");
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
    }
  });

  listen("activate-search", () => {
    if (overlayManager.state == "search") {
      dismissSearch();
      capsule.classList.remove("search");
    } else {
      activateSearch();
      capsule.classList.add("search");
    }
  });

  document.addEventListener("overlay-changed", ((_e: CustomEvent) => {
    if (overlayManager.state == "search") {
      dismissSearch();
      capsule.classList.remove("search");
    }
  }) as EventListener);

  listen<SearchResult[]>("search-results", (event) => {
    if (overlayManager.state == "search") {
      renderResults(event.payload);
    }
  });
}
