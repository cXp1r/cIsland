import { invoke } from "@tauri-apps/api/core";
import { initSettingsAbout } from "./about";
import { initSettingsAi } from "./ai";
import { initSettingsBlacklist } from "./blacklist";
import { initSettingsClipboardLinks } from "./clipboard-links";
import { initSettingsDownloader } from "./downloader";
import { initSettingsEmail } from "./email";
import { initSettingsGeneral } from "./general";
import { initSettingsLog } from "./log";
import { initSettingsLyricOffset } from "./lyric-offset";
import { initSettingsMusic } from "./music";
import { initSettingsBetterncm } from "./betterncm";
import { initSettingsSadb } from "./sadb";
import { initSettingsScreens } from "./screens";
import { initSettingsSmtcWhitelist } from "./smtc-whitelist";
import { initSettingsTools } from "./tools";
import { initSettingsWeather } from "./weather";
import { initSettingsWindow } from "./window";
import { initSettingsAgentHandlerInstaller } from "./agent-handler";

export let exeDir = "";
export let configDir = "";
export let userDir = "";

type PageInfo = {
  title: string;
  desc: string;
};

type PageId =
  | "general"
  | "screens"
  | "tools"
  | "downloader"
  | "music"
  | "lyric-offset"
  | "weather"
  | "ai"
  | "clipboard-links"
  | "email"
  | "plugins"
  | "sadb"
  | "blacklist"
  | "log"
  | "about";

const pageInfo: Record<PageId, PageInfo> = {
  general: { title: "常规设置", desc: "配置快捷键和外观选项。" },
  screens: { title: "屏幕设置", desc: "配置多屏定位和偏移。" },
  tools: { title: "工具设置", desc: "配置辅助工具。" },
  downloader: { title: "下载器", desc: "aria2c 下载器。" },
  music: { title: "音乐", desc: "配置音乐和歌词显示策略。" },
  "lyric-offset": { title: "歌词补偿", desc: "按播放器单独配置歌词补偿。" },
  weather: { title: "天气", desc: "配置天气显示位置。" },
  ai: { title: "AI Agent", desc: "配置 OpenAI 兼容 API 和模型参数。" },
  "clipboard-links": { title: "剪贴板与链接", desc: "配置剪贴板监听和链接处理器。" },
  email: { title: "邮件", desc: "配置邮件轮询和通知快捷键。" },
  plugins: { title: "插件管理", desc: "管理 InfLink 和 PluginMarket 相关设置。" },
  sadb: { title: "ADB 镜像", desc: "配置 Android 设备屏幕镜像连接参数。" },
  blacklist: { title: "黑名单", desc: "配置自动隐藏灵动岛的进程列表。" },
  log: { title: "日志", desc: "配置日志等级和 Tag 过滤。" },
  about: { title: "关于与更新", desc: "查看版本信息和检查软件更新。" },
};

const pageInit: Record<PageId, () => void | Promise<void>> = {
  general: initSettingsGeneral,
  screens: initSettingsScreens,
  tools: async () => {
    await initSettingsTools();
    initSettingsAgentHandlerInstaller();
  },
  downloader: initSettingsDownloader,
  music: async () => {
    await initSettingsMusic();
    initSettingsSmtcWhitelist();
  },
  "lyric-offset": initSettingsLyricOffset,
  weather: initSettingsWeather,
  ai: initSettingsAi,
  "clipboard-links": initSettingsClipboardLinks,
  email: initSettingsEmail,
  plugins: initSettingsBetterncm,
  sadb: initSettingsSadb,
  blacklist: initSettingsBlacklist,
  log: initSettingsLog,
  about: initSettingsAbout,
};

function isPageId(value: string): value is PageId {
  return value in pageInfo;
}

async function navigateTo(pageId: PageId): Promise<void> {
  document.querySelectorAll<HTMLElement>(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelector<HTMLElement>(`.nav-item[data-page="${pageId}"]`)?.classList.add("active");
  document.querySelectorAll<HTMLElement>(".page").forEach((page) => page.classList.remove("active"));
  document.getElementById(`page-${pageId}`)?.classList.add("active");

  const title = document.getElementById("page-title");
  const desc = document.getElementById("page-desc");
  if (title) title.textContent = pageInfo[pageId].title;
  if (desc) desc.textContent = pageInfo[pageId].desc;

  await pageInit[pageId]();
}

function initNavigation(): void {
  document.querySelectorAll<HTMLElement>(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page || "";
      if (isPageId(page)) void navigateTo(page);
    });
  });

  document.querySelectorAll<HTMLElement>("[data-nav-to]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.navTo || "";
      if (isPageId(page)) void navigateTo(page);
    });
  });
}

const initDirs = Promise.all([
  invoke<string>("get_exe_dir").then((d) => {
    exeDir = `${d}\\`;
  }),
  invoke<string>("get_config_dir").then((d) => {
    configDir = `${d}\\`;
  }),
  invoke<string>("get_user_dir").then((d) => {
    userDir = `${d}\\`;
  }),
]);

document.addEventListener("DOMContentLoaded", () => {
  initDirs.then(() => {
    initSettingsWindow();
    initNavigation();
    void navigateTo("general");
  });
});
