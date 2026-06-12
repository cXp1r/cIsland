import type { ViewMode } from "./types";
import { $ } from "../shared";


export const capsule = $<HTMLDivElement>("island-capsule");
export const currentViewContainer = $<HTMLDivElement>("current-view");

export const viewHolder = $<HTMLDivElement>("view-holder");export const timeWrapper = $<HTMLDivElement>("time-wrapper");
export const timeText = $<HTMLDivElement>("time-text");
export const dateText = $<HTMLDivElement>("date-text");
export const weatherText = $<HTMLDivElement>("weather-text");
export const panel = document.getElementById("panel") as  HTMLDivElement;
export const noticeArea = $<HTMLDivElement>("notice-area");

export const agentHandler = $<HTMLDivElement>("agent-handler");

export const lyricArea = $<HTMLDivElement>("lyric-area");
export const lyricText = $<HTMLDivElement>("lyric-text");
export const lyricTextInner = $<HTMLSpanElement>("lyric-text-inner");
export const lyricMeta = $<HTMLDivElement>("lyric-meta");
export const vinylDisc = $<HTMLDivElement>("vinyl-disc");
export const vinylCover = $<HTMLDivElement>("vinyl-cover");export const progressBar = $<HTMLDivElement>("progress-bar");
export const progressFill = $<HTMLDivElement>("progress-fill");
export const progressThumb = $<HTMLDivElement>("progress-thumb");

export const musicPanelCoverImg = $<HTMLDivElement>("music-panel-cover-img");
export const musicPanelSong = $<HTMLDivElement>("music-panel-song");
export const musicPanelArtist = $<HTMLDivElement>("music-panel-artist");
export const mpProgressBar = $<HTMLDivElement>("mp-progress-bar");
export const mpProgressFill = $<HTMLDivElement>("mp-progress-fill");
export const mpProgressThumb = $<HTMLDivElement>("mp-progress-thumb");
export const mpTimeCurrent = $<HTMLSpanElement>("mp-time-current");
export const mpTimeTotal = $<HTMLSpanElement>("mp-time-total");
export const mpPrev = $<HTMLButtonElement>("mp-prev");
export const mpPlay = $<HTMLButtonElement>("mp-play");
export const mpNext = $<HTMLButtonElement>("mp-next");
export const mpIconPlay = mpPlay.querySelector(".mp-icon-play") as SVGElement;
export const mpIconPause = mpPlay.querySelector(".mp-icon-pause") as SVGElement;
export const mpVolumeBar = $<HTMLDivElement>("mp-volume-bar");
export const mpVolumeFill = $<HTMLDivElement>("mp-volume-fill");
export const mpVolumeThumb = $<HTMLDivElement>("mp-volume-thumb");
export const mpLyricText = $<HTMLDivElement>("mp-lyric-text");

export const agentArea = $<HTMLDivElement>("agent-area");
export const agentMessages = $<HTMLDivElement>("agent-messages");
export const agentInput = $<HTMLInputElement>("agent-input");
export const agentSendBtn = $<HTMLButtonElement>("agent-send-btn");
export const agentStopBtn = $<HTMLButtonElement>("agent-stop-btn");
export const agentModelName = $<HTMLDivElement>("agent-model-name");
export const agentStatusLabel = $<HTMLDivElement>("agent-status-label");
export const agentClearBtn = $<HTMLButtonElement>("agent-clear-btn");
export const agentConfirmDialog = $<HTMLDivElement>("agent-confirm-dialog");
export const agentConfirmCancel = $<HTMLButtonElement>("agent-confirm-cancel");
export const agentConfirmOk = $<HTMLButtonElement>("agent-confirm-ok");


export const searchArea = $<HTMLDivElement>("search-area");
export const searchInput = $<HTMLInputElement>("search-input");
export const searchResults = $<HTMLDivElement>("search-results");
export const searchPrevBtn = $<HTMLButtonElement>("search-prev-btn");
export const searchNextBtn = $<HTMLButtonElement>("search-next-btn");
export const searchPageLabel = $<HTMLSpanElement>("search-page-label");

export const emailArea = $<HTMLDivElement>("email-area");
export const emailPanel = $<HTMLDivElement>("email-panel");
export const emailListItems = $<HTMLDivElement>("email-list-items");
export const emailContent = $<HTMLDivElement>("email-content");
export const emailCount = $<HTMLSpanElement>("email-count");
export const emailRefreshBtn = $<HTMLButtonElement>("email-refresh-btn");
export const emailClearCacheBtn = $<HTMLButtonElement>("email-clear-cache-btn");
export const emailDragHandle = $<HTMLDivElement>("email-drag-handle");
export const emailResizeHandle = $<HTMLDivElement>("email-resize-handle");

export const downloader = $<HTMLDivElement>("downloader");
export const btnPrev = $<HTMLButtonElement>("btn-prev");
export const btnPlay = $<HTMLButtonElement>("btn-play");
export const btnNext = $<HTMLButtonElement>("btn-next");
export const iconPlay = $<HTMLElement>("icon-play");
export const iconPause = $<HTMLElement>("icon-pause");

export const viewSwitcher = $<HTMLDivElement>("view-switcher");
export const viewDots = $<HTMLDivElement>("view-dots");
export const privacyIndicators = $<HTMLDivElement>("privacy-indicators");
export const privacyMic = $<HTMLDivElement>("privacy-mic");
export const privacyCamera = $<HTMLDivElement>("privacy-camera");
export const collapsedIndicator = $<HTMLDivElement>("collapsed-indicator");export const sadbArea = $<HTMLDivElement>("sadb-area");
export const viewElements: Record<ViewMode, HTMLElement> = {
  time: timeWrapper,
  lyric: lyricArea,
  agent: agentArea,
  search: searchArea,
  sadb: sadbArea,
  email: emailArea,
  downloader: downloader,
};

