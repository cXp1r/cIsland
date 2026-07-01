import { $ } from "../../shared/dom";


export const timeText = $<HTMLDivElement>("time-text");
export const dateText = $<HTMLDivElement>("date-text");
export const weatherText = $<HTMLDivElement>("weather-text");

export const todoInput = $<HTMLInputElement>("todoInput");
export const todoAdd = $<HTMLButtonElement>("todoAdd");
export const todoList = $<HTMLUListElement>("todoList");

export const clockHour = $<HTMLElement>("cH");
export const clockMinute = $<HTMLElement>("cM");
export const clockSecond = $<HTMLElement>("cS");
export const clockDate = $<HTMLElement>("cDate");
export const clockWeekday = $<HTMLElement>("cDay");
export const dayRing = document.getElementById("dayRing") as unknown as SVGCircleElement;
export const ringText = document.getElementById("ringTxt") as unknown as SVGTextElement;
export const calendarPrev = $<HTMLButtonElement>("calPrev");
export const calendarNext = $<HTMLButtonElement>("calNext");
export const calendarMonth = $<HTMLElement>("calMonth");
export const calendarGrid = $<HTMLDivElement>("calGrid");
