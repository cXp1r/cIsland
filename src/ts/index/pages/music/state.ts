export let isPlaying = false;
export function setIsPlaying(v: boolean) { isPlaying = v; }

export let tokenSpans: HTMLSpanElement[] = [];
export function setTokenSpans(v: HTMLSpanElement[]) { tokenSpans = v; }

export let currentLyricTokenKey = "";
export function setCurrentLyricTokenKey(v: string) { currentLyricTokenKey = v; }

export let activeLyricTokens: Array<{ text: string; start_ms: number; end_ms: number }> | null = null;
export function setActiveLyricTokens(v: Array<{ text: string; start_ms: number; end_ms: number }> | null) { activeLyricTokens = v; }

export let activeLyricBasePositionMs = 0;
export function setActiveLyricBasePositionMs(v: number) { activeLyricBasePositionMs = v; }

export let activeLyricBasePerfMs = 0;
export function setActiveLyricBasePerfMs(v: number) { activeLyricBasePerfMs = v; }

export let lyricScrollLineStartMs: number | null = null;
export function setLyricScrollLineStartMs(v: number | null) { lyricScrollLineStartMs = v; }

export let lyricScrollNextLineTimeMs: number | null = null;
export function setLyricScrollNextLineTimeMs(v: number | null) { lyricScrollNextLineTimeMs = v; }

export let lyricScrollLastX = 0;
export function setLyricScrollLastX(v: number) { lyricScrollLastX = v; }

export let mpCurrentLyricInner: HTMLSpanElement | null = null;
export function setMpCurrentLyricInner(v: HTMLSpanElement | null) { mpCurrentLyricInner = v; }

export let mpCurrentLyricOuter: HTMLElement | null = null;
export function setMpCurrentLyricOuter(v: HTMLElement | null) { mpCurrentLyricOuter = v; }

export let mpTokenSpans: HTMLSpanElement[] = [];
export function setMpTokenSpans(v: HTMLSpanElement[]) { mpTokenSpans = v; }

export let currentMpLyricTokenKey = "";
export function setCurrentMpLyricTokenKey(v: string) { currentMpLyricTokenKey = v; }

export let lyricFpsWindowStartMs = 0;
export function setLyricFpsWindowStartMs(v: number) { lyricFpsWindowStartMs = v; }

export let lyricFpsFrameCount = 0;
export function setLyricFpsFrameCount(v: number) { lyricFpsFrameCount = v; }

export let tokenAnimationId: number | null = null;
export function setTokenAnimationId(v: number | null) { tokenAnimationId = v; }

export let prevLineMap: Map<string, HTMLElement> = new Map();
export function setPrevLineMap(v: Map<string, HTMLElement>) { prevLineMap = v; }

export let currentDurationMs = 0;
export function setCurrentDurationMs(v: number) { currentDurationMs = v; }

export let isSeekable = true;
export function setIsSeekable(v: boolean) { isSeekable = v; }

export let currentSongTitle = "";
export function setCurrentSongTitle(v: string) { currentSongTitle = v; }

export let currentArtistName = "";
export function setCurrentArtistName(v: string) { currentArtistName = v; }

export let currentThumbnailUrl = "";
export function setCurrentThumbnailUrl(v: string) { currentThumbnailUrl = v; }
