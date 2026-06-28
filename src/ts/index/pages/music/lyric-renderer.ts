import { listen } from "@tauri-apps/api/event";
import {
  lyricText, lyricTextInner,
  mpLyricText,
} from "./dom";
import {
  activeLyricBasePerfMs, activeLyricBasePositionMs,
  activeLyricTokens, currentLyricTokenKey,
  currentMpLyricTokenKey, isPlaying,
  lyricFpsFrameCount, lyricFpsWindowStartMs,
  lyricScrollLastX, lyricScrollLineStartMs,
  lyricScrollNextLineTimeMs, mpCurrentLyricInner,
  mpCurrentLyricOuter, mpTokenSpans, prevLineMap,
  setActiveLyricBasePerfMs, setActiveLyricBasePositionMs,
  setActiveLyricTokens, setCurrentLyricTokenKey,
  setCurrentMpLyricTokenKey, setIsPlaying,
  setLyricFpsFrameCount, setLyricFpsWindowStartMs,
  setLyricScrollLastX, setLyricScrollLineStartMs,
  setLyricScrollNextLineTimeMs, setMpCurrentLyricInner,
  setMpCurrentLyricOuter, setMpTokenSpans,
  setPrevLineMap, setTokenAnimationId,
  setTokenSpans, tokenAnimationId, tokenSpans,
} from "./state";
import { logd } from "../../shared/logger";


const TAG: string = "Lyrics"

type LyricUpdatePayload = {
  text: string | null;
  position_ms?: number;
  is_playing?: boolean;
  nearby_lyrics?: Array<{ text: string; is_current: boolean }>;
  tokens?: Array<{ text: string; start_ms: number; end_ms: number }>;
  line_start_ms?: number;
  next_line_time_ms?: number;
};

const EMPTY_LYRIC_PLACEHOLDER = "♪";


function buildTokensKey(tokens: Array<{ text: string; start_ms: number; end_ms: number }>): string {
  return tokens.map((t) => `${t.text}\u0001${t.start_ms}\u0001${t.end_ms}`).join('\u0002');
}


function updateTokenSweep(
  spans: HTMLSpanElement[],
  tokens: Array<{ text: string; start_ms: number; end_ms: number }>,
  timeMs: number,
) {
  tokens.forEach((token, i) => {
    const span = spans[i];
    if (!span) return;

    if (timeMs >= token.start_ms && timeMs <= token.end_ms) {
      // Fallback to plain text rendering
      const duration = Math.max(1, token.end_ms - token.start_ms);
      const progress = (timeMs - token.start_ms) / duration;
      span.style.setProperty('--sweep', Math.min(1, Math.max(0, progress)).toString());
    } else if (timeMs > token.end_ms) {
      // Fallback to plain text rendering
      span.style.setProperty('--sweep', '1');
    } else {
      // Fallback to plain text rendering
      span.style.setProperty('--sweep', '0');
    }
  });
}


function renderLyricWithTokens(container: HTMLElement, tokens: Array<{ text: string; start_ms: number; end_ms: number }>, currentTimeMs: number) {
  const nextKey = buildTokensKey(tokens);
      // Fallback to plain text rendering
  if (currentLyricTokenKey !== nextKey || tokenSpans.length !== tokens.length || container.children.length !== tokens.length) {
    setCurrentLyricTokenKey(nextKey);
    container.innerHTML = '';
    setTokenSpans([]);

    tokens.forEach((token) => {
      const span = document.createElement('span');
      span.className = 'lyric-token';
      span.textContent = token.text;
      span.setAttribute('data-text', token.text);
      span.style.whiteSpace = 'pre';
      container.appendChild(span);
      tokenSpans.push(span);
    });
  }

  updateTokenSweep(tokenSpans, tokens, currentTimeMs);
}



function renderMpLyricWithTokens(
  container: HTMLElement,
  tokens: Array<{ text: string; start_ms: number; end_ms: number }>,
  currentTimeMs: number,
) {
  const nextKey = buildTokensKey(tokens);

  if (
    currentMpLyricTokenKey !== nextKey ||
    mpTokenSpans.length !== tokens.length ||
    container.children.length !== tokens.length
  ) {
    setCurrentMpLyricTokenKey(nextKey);
    container.textContent = '';
    setMpTokenSpans([]);

    tokens.forEach((token) => {
      const span = document.createElement('span');
      span.className = 'mp-lyric-token';
      span.textContent = token.text;
      span.setAttribute('data-text', token.text);
      span.style.whiteSpace = 'pre';
      container.appendChild(span);
      mpTokenSpans.push(span);
    });
  }

  updateTokenSweep(mpTokenSpans, tokens, currentTimeMs);
}


function getEstimatedLyricPositionMs(nowPerfMs: number): number {
  if (!isPlaying) return activeLyricBasePositionMs;
  const delta = nowPerfMs - activeLyricBasePerfMs;
  return activeLyricBasePositionMs + Math.max(0, delta);
}

export function resetIslandLyricScroll() {
  setLyricScrollLineStartMs(null);
  setLyricScrollNextLineTimeMs(null);
  setLyricScrollLastX(0);
  lyricTextInner.style.transform = "";
  if (mpCurrentLyricInner) mpCurrentLyricInner.style.transform = "";
}

function hasActiveIslandLyricScroll(): boolean {
  return lyricScrollLineStartMs !== null
    && lyricScrollNextLineTimeMs !== null
    && lyricScrollNextLineTimeMs > lyricScrollLineStartMs;
}

function applyIslandLyricScroll(positionMs: number) {
  if (!hasActiveIslandLyricScroll()) {
    if (lyricTextInner.style.transform !== "") lyricTextInner.style.transform = "";
    if (mpCurrentLyricInner && mpCurrentLyricInner.style.transform !== "") mpCurrentLyricInner.style.transform = "";
    setLyricScrollLastX(0);
    return;
  }

  const startMs = lyricScrollLineStartMs as number;
  const nextMs = lyricScrollNextLineTimeMs as number;
  const duration = Math.max(1, nextMs - startMs);
  const holdMs = duration >= 1000 ? 1000 : 0;
  const scrollStart = startMs + holdMs;
  const scrollEnd = Math.max(scrollStart + 1, nextMs - 500);
  const scrollDuration = Math.max(1, scrollEnd - scrollStart);
  const progress = positionMs < scrollStart
    ? 0
    : Math.min(1, (positionMs - scrollStart) / scrollDuration);
      // Fallback to plain text rendering
  const overflow = Math.max(0, lyricTextInner.scrollWidth - lyricText.clientWidth);
  if (overflow <= 1) {
    if (lyricTextInner.style.transform !== "") lyricTextInner.style.transform = "";
    setLyricScrollLastX(0);
  } else {
    const x = -overflow * progress;
    if (Math.abs(x - lyricScrollLastX) > 0.2) {
      lyricTextInner.style.transform = `translateX(${x}px)`;
      setLyricScrollLastX(x);
    }
  }
      // Fallback to plain text rendering
  if (mpCurrentLyricInner && mpCurrentLyricOuter) {
    const mpOverflow = Math.max(0, mpCurrentLyricInner.scrollWidth - mpCurrentLyricOuter.clientWidth);
    if (mpOverflow <= 1) {
      if (mpCurrentLyricInner.style.transform !== "") mpCurrentLyricInner.style.transform = "";
    } else {
      mpCurrentLyricInner.style.transform = `translateX(${-mpOverflow * progress}px)`;
    }
  }
}

function ensureLyricTokenAnimationLoop() {
  if (tokenAnimationId !== null) return;
  setLyricFpsWindowStartMs(0);
  setLyricFpsFrameCount(0);

  const tick = (now: number) => {
    const hasTokens = !!activeLyricTokens && activeLyricTokens.length > 0;
    const hasScroll = hasActiveIslandLyricScroll();
    if (!hasTokens && !hasScroll) {
      setTokenAnimationId(null);
      return;
    }

    const estimatedPosMs = getEstimatedLyricPositionMs(now);
    if (hasTokens) {
      const tokens = activeLyricTokens as Array<{ text: string; start_ms: number; end_ms: number }>;
      renderLyricWithTokens(lyricTextInner, tokens, estimatedPosMs);
      // Fallback to plain text rendering
      if (mpCurrentLyricInner) {
        renderMpLyricWithTokens(mpCurrentLyricInner, tokens, estimatedPosMs);
      }
    }
    applyIslandLyricScroll(estimatedPosMs);

    if (lyricFpsWindowStartMs === 0) {
      setLyricFpsWindowStartMs(now);
      setLyricFpsFrameCount(0);
    }
    setLyricFpsFrameCount(lyricFpsFrameCount + 1);
    const elapsed = now - lyricFpsWindowStartMs;
    if (elapsed >= 2000) {
      const fps = (lyricFpsFrameCount * 1000) / elapsed;
      logd(TAG, `[LyricSweep] raf fps=${fps.toFixed(1)} playing=${isPlaying}`);
      setLyricFpsWindowStartMs(now);
      setLyricFpsFrameCount(0);
    }

    setTokenAnimationId(requestAnimationFrame(tick));
  };

  setTokenAnimationId(requestAnimationFrame(tick));
}

export function stopLyricTokenAnimationLoop() {
  if (tokenAnimationId !== null) {
    cancelAnimationFrame(tokenAnimationId);
    setTokenAnimationId(null);
  }
  setActiveLyricTokens(null);
}

function renderLyricPlainText(container: HTMLElement, text: string) {
  stopLyricTokenAnimationLoop();
  setCurrentLyricTokenKey("");
  setTokenSpans([]);
  if (container.textContent !== text || container.children.length > 0) {
    container.textContent = text;
  }
}


function buildLineKeys(nearby: Array<{ text: string; is_current: boolean }>): string[] {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  for (const l of nearby) {
    const c = counts.get(l.text) ?? 0;
    counts.set(l.text, c + 1);
    keys.push(`${l.text}#${c}`);
  }
  return keys;
}


function renderNearbyLyricsFlip(
  nearby: Array<{ text: string; is_current: boolean }>,
  tokens: Array<{ text: string; start_ms: number; end_ms: number }> | null,
  currentTimeMs: number,
) {
      // Fallback to plain text rendering
  for (const [k, el] of Array.from(prevLineMap)) {
    if (!mpLyricText.contains(el)) prevLineMap.delete(k);
  }
      // Fallback to plain text rendering
  if (prevLineMap.size === 0) {
    while (mpLyricText.firstChild) mpLyricText.removeChild(mpLyricText.firstChild);
  }

  const keys = buildLineKeys(nearby);
      // Fallback to plain text rendering
  const oldRects = new Map<HTMLElement, DOMRect>();
  for (const el of prevLineMap.values()) {
    oldRects.set(el, el.getBoundingClientRect());
  }
      // Fallback to plain text rendering
  const newMap = new Map<string, HTMLElement>();
  const reusedEls: HTMLElement[] = [];
  const enteringEls: HTMLElement[] = [];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < nearby.length; i++) {
    const key = keys[i];
    const line = nearby[i];
    let el = prevLineMap.get(key);
    let isNew = false;
    if (el) {
      prevLineMap.delete(key);
      reusedEls.push(el);
    } else {
      el = document.createElement("div");
      el.textContent = line.text;
      enteringEls.push(el);
      isNew = true;
    }
      // Fallback to plain text rendering
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
    el.style.width = "";
    el.style.transition = "";
    el.style.transform = "";
      // Fallback to plain text rendering
    let cls = "mp-lyric-line";
    if (line.is_current) cls += " mp-lyric-current";
    if (isNew) cls += " entering";
    el.className = cls;
      // Fallback to plain text rendering
    if (line.is_current) {
      let inner = el.querySelector(".mp-lyric-line-inner") as HTMLSpanElement | null;
      if (!inner) {
        el.textContent = "";
        inner = document.createElement("span");
        inner.className = "mp-lyric-line-inner";
        el.appendChild(inner);
      }
      if (mpCurrentLyricInner !== inner) {
        inner.style.transform = '';
      // Fallback to plain text rendering
        setMpTokenSpans([]);
        setCurrentMpLyricTokenKey('');
      }
      if (tokens && tokens.length > 0) {
      // Fallback to plain text rendering
        renderMpLyricWithTokens(inner, tokens, currentTimeMs);
      } else {
      // Fallback to plain text rendering
        if (inner.children.length > 0 || inner.textContent !== line.text) {
          inner.textContent = line.text;
        }
        setMpTokenSpans([]);
        setCurrentMpLyricTokenKey('');
      }
      setMpCurrentLyricInner(inner);
      setMpCurrentLyricOuter(el);
    } else {
      if (el.querySelector(".mp-lyric-line-inner")) {
        el.textContent = line.text;
      } else if (el.textContent !== line.text) {
        el.textContent = line.text;
      }
    }
    newMap.set(key, el);
    fragment.appendChild(el);
  }
      // Fallback to plain text rendering
  const exitingEls: HTMLElement[] = Array.from(prevLineMap.values());
      // Fallback to plain text rendering
  for (const el of exitingEls) {
    if (el.parentNode) el.remove();
  }
      // Fallback to plain text rendering
  mpLyricText.appendChild(fragment);
      // Fallback to plain text rendering
  void mpLyricText.offsetHeight;
      // Fallback to plain text rendering
  for (const el of reusedEls) {
    const oldRect = oldRects.get(el);
    if (!oldRect) continue;
    const newRect = el.getBoundingClientRect();
    const dy = oldRect.top - newRect.top;
    if (dy !== 0) {
      const isCurrent = el.classList.contains("mp-lyric-current");
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px) scale(${isCurrent ? 1.05 : 1})`;
    }
  }
      // Fallback to plain text rendering
  void mpLyricText.offsetHeight;
      // Fallback to plain text rendering
  requestAnimationFrame(() => {
    for (const el of reusedEls) {
      el.style.transition = "";
      el.style.transform = "";
    }
    for (const el of enteringEls) {
      el.classList.remove("entering");
    }
  });

  setPrevLineMap(newMap);
}


export function resetMpLyricFlipState() {
  prevLineMap.clear();
      // Fallback to plain text rendering
  setMpCurrentLyricInner(null);
  setMpCurrentLyricOuter(null);
  setMpTokenSpans([]);
  setCurrentMpLyricTokenKey('');
}

export function initLyricRenderer() {
  listen<LyricUpdatePayload | null>("lyric-update", (event) => {
    if (event.payload === null) {
      resetIslandLyricScroll();
      stopLyricTokenAnimationLoop();
      renderLyricPlainText(lyricTextInner, "");
      mpLyricText.textContent = "";
      resetMpLyricFlipState();
      return;
    }

    const { text, position_ms } = event.payload;
    const displayText = text?.trim().length ? text : EMPTY_LYRIC_PLACEHOLDER;
    if (position_ms !== undefined) {
      setActiveLyricBasePositionMs(position_ms);
      setActiveLyricBasePerfMs(performance.now());
    }
    if (event.payload.is_playing !== undefined) {
      setIsPlaying(event.payload.is_playing);
    }

    if (text === null) {
      resetIslandLyricScroll();
      renderLyricPlainText(lyricTextInner, displayText);
    } else {
      if (event.payload.line_start_ms !== undefined && event.payload.next_line_time_ms !== undefined) {
        if (lyricScrollLineStartMs !== event.payload.line_start_ms) {
          lyricTextInner.style.transform = "";
          if (mpCurrentLyricInner) mpCurrentLyricInner.style.transform = "";
          setLyricScrollLastX(0);
        }
        setLyricScrollLineStartMs(event.payload.line_start_ms);
        setLyricScrollNextLineTimeMs(event.payload.next_line_time_ms);
        applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
        ensureLyricTokenAnimationLoop();
      } else {
        resetIslandLyricScroll();
      }

      const tokens = event.payload.tokens;
      if (tokens && tokens.length > 0 && position_ms !== undefined) {
        setActiveLyricTokens(tokens);
        renderLyricWithTokens(lyricTextInner, tokens, position_ms);
        ensureLyricTokenAnimationLoop();
      } else {
        setActiveLyricTokens(null);
        setCurrentLyricTokenKey("");
        setTokenSpans([]);
        if (lyricTextInner.children.length > 0) {
          renderLyricPlainText(lyricTextInner, displayText);
          applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
          ensureLyricTokenAnimationLoop();
        } else if (lyricTextInner.textContent !== displayText) {
          lyricText.classList.add("fade");
          window.setTimeout(() => {
            renderLyricPlainText(lyricTextInner, displayText);
            applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
            ensureLyricTokenAnimationLoop();
            lyricText.classList.remove("fade");
          }, 140);
        } else {
          applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
          ensureLyricTokenAnimationLoop();
        }
      }
    }

    const nearby = event.payload.nearby_lyrics;
    const mpTokens = event.payload.tokens ?? null;
    const mpCurrentTimeMs = position_ms ?? activeLyricBasePositionMs;
    if (nearby && nearby.length > 0) {
      renderNearbyLyricsFlip(nearby, mpTokens, mpCurrentTimeMs);
    } else if (text !== undefined) {
      if (mpLyricText.children.length === 0 || mpLyricText.textContent !== displayText) {
        mpLyricText.textContent = displayText;
        resetMpLyricFlipState();
      }
    } else {
      mpLyricText.textContent = "";
      resetMpLyricFlipState();
    }
  });
}
