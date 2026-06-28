import { $ } from "../../shared/dom";

export const downloaderUrl = $<HTMLInputElement>("downloader-url");
export const downloaderSaveDir = $<HTMLInputElement>("downloader-save-dir");
export const downloaderDownloadButton = $<HTMLButtonElement>("downloader-download-btn");
export const downloaderOpenDirButton = $<HTMLButtonElement>("downloader-open-dir-btn");
export const downloaderResult = $<HTMLDivElement>("downloader-result");
export const aria2cProgressWrapper = $<HTMLDivElement>("aria2c-progress-wrapper");

