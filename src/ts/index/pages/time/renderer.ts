import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { WeatherResult } from "../../utils/types";
import type { PageRenderSpec } from "../types";
import {
  calendarGrid,
  calendarMonth,
  calendarNext,
  calendarPrev,
  clockDate,
  clockHour,
  clockMinute,
  clockSecond,
  clockWeekday,
  dateText,
  dayRing,
  ringText,
  timeText,
  timeWrapper,
  weatherText,
} from "./dom";

const WEEKDAYS_LABEL = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
const WEEKDAYS_CN = ["日", "一", "二", "三", "四", "五", "六"] as const;
const MONTHS_CN = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;
const CIRCUMFERENCE = 113;

let calendarYear: number;
let calendarMonthIndex: number;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateLabel(now: Date): string {
  return `${WEEKDAYS_LABEL[now.getDay()]} ${now.getMonth() + 1}/${now.getDate()}`;
}

function updateTimeAndDate(): void {
  const now = new Date();
  timeText.innerText = now.toLocaleTimeString("zh-CN", { hour12: false });
  dateText.innerText = formatDateLabel(now);
}

async function refreshWeather(force = false): Promise<void> {
  if (force) {
    weatherText.textContent = "获取中...";
    void invoke("refresh_weather");
    return;
  }

  try {
    const result = await invoke<WeatherResult>("get_weather");
    weatherText.textContent = result.city
      ? `${result.city} ${result.desc} ${result.temp}°C`
      : `${result.desc} ${result.temp}°C`;
  } catch {
    if (weatherText.textContent === "") {
      weatherText.textContent = "获取中...";
    }
  }
}

function tickClock(): void {
  const now = new Date();
  clockHour.textContent = pad(now.getHours());
  clockMinute.textContent = pad(now.getMinutes());
  clockSecond.textContent = pad(now.getSeconds());
  clockDate.textContent = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  clockWeekday.textContent = `星期${WEEKDAYS_CN[now.getDay()]}`;

  const elapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const pct = Math.round((elapsed / 86400) * 100);
  dayRing.setAttribute(
    "stroke-dashoffset",
    String(CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE),
  );
  ringText.textContent = `${pct}%`;
}

function renderCalendar(): void {
  const now = new Date();
  if (calendarYear === undefined) {
    calendarYear = now.getFullYear();
    calendarMonthIndex = now.getMonth();
  }

  calendarMonth.textContent = `${calendarYear} ${MONTHS_CN[calendarMonthIndex]}`;
  calendarGrid.innerHTML = "";

  WEEKDAYS_CN.forEach((d) => {
    const el = document.createElement("div");
    el.className = "cal-weekday";
    el.textContent = d;
    calendarGrid.appendChild(el);
  });

  const firstWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const prevMonthDays = new Date(calendarYear, calendarMonthIndex, 0).getDate();

  for (let i = 0; i < firstWeekday; i += 1) {
    const el = document.createElement("div");
    el.className = "cal-day other-month";
    el.textContent = String(prevMonthDays - firstWeekday + 1 + i);
    calendarGrid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const el = document.createElement("div");
    const isToday = d === now.getDate()
      && calendarYear === now.getFullYear()
      && calendarMonthIndex === now.getMonth();
    el.className = `cal-day${isToday ? " today" : ""}`;
    el.textContent = String(d);
    calendarGrid.appendChild(el);
  }

  const trailing = (firstWeekday + daysInMonth) % 7;
  for (let i = 1; i <= (trailing === 0 ? 0 : 7 - trailing); i += 1) {
    const el = document.createElement("div");
    el.className = "cal-day other-month";
    el.textContent = String(i);
    calendarGrid.appendChild(el);
  }
}

function changeMonth(delta: number): void {
  calendarMonthIndex += delta;
  if (calendarMonthIndex > 11) {
    calendarMonthIndex = 0;
    calendarYear += 1;
  }
  if (calendarMonthIndex < 0) {
    calendarMonthIndex = 11;
    calendarYear -= 1;
  }
  renderCalendar();
}

function initCollapsedRenderer(): void {
  weatherText.style.cursor = "pointer";
  weatherText.title = "点击刷新天气";
  weatherText.addEventListener("click", (e) => {
    e.stopPropagation();
    void refreshWeather(true);
  });

  timeWrapper.addEventListener("mouseenter", updateTimeAndDate);
  setInterval(updateTimeAndDate, 1000);
  updateTimeAndDate();
  void refreshWeather();

  listen<WeatherResult>("weather-updated", (event) => {
    const r = event.payload;
    weatherText.textContent = r.city
      ? `${r.city} ${r.desc} ${r.temp}°C`
      : `${r.desc} ${r.temp}°C`;
  });

  listen<{ error: string }>("weather-error", () => {
    if (weatherText.textContent === "获取中...") {
      weatherText.textContent = "天气暂不可用";
    }
  });

  listen("weather-city-changed", () => {
    weatherText.textContent = "获取中...";
  });
}

function initExpandedRenderer(): void {
  tickClock();
  setInterval(tickClock, 1000);
  calendarPrev.addEventListener("click", () => changeMonth(-1));
  calendarNext.addEventListener("click", () => changeMonth(1));
  renderCalendar();
}

export function initTimeRenderers(): void {
  initCollapsedRenderer();
  initExpandedRenderer();
}

export const timeList: Record<string, PageRenderSpec> = {
  collapsed: {
    classList: null,
    size: [140, 50],
  },
  expanded: {
    classList: ["expanded"],
    size: [700, 200],
  },
};

