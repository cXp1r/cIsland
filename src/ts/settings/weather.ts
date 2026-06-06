import { invoke } from "@tauri-apps/api/core";
import { loge } from "../index/logger";
import { showStatus } from "./shared";
import type { CityResult } from "./types";

const TAG = "Settings/Weather";
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let citySearchTimer: number | null = null;
let bound = false;

function getEls() {
  return {
    search: $<HTMLInputElement>("weather-city-search"),
    results: $<HTMLDivElement>("city-results"),
    current: $<HTMLDivElement>("city-current"),
    tag: $<HTMLSpanElement>("city-tag"),
    clearBtn: $<HTMLButtonElement>("clear-city-btn"),
  };
}

function renderCity(name: string): void {
  const e = getEls();
  if (name) {
    e.tag.textContent = name;
    e.current.style.display = "flex";
  } else {
    e.tag.textContent = "";
    e.current.style.display = "none";
  }
}

async function load(): Promise<void> {
  const settings = await invoke<{ weather_city: string }>("get_settings");
  renderCity(settings.weather_city || "");
}

function bindEvents(): void {
  if (bound) return;
  const e = getEls();

  e.search.addEventListener("input", () => {
    if (citySearchTimer) clearTimeout(citySearchTimer);
    const query = e.search.value.trim();

    if (!query) {
      e.results.classList.remove("active");
      e.results.innerHTML = "";
      return;
    }

    citySearchTimer = window.setTimeout(async () => {
      try {
        const results = await invoke<CityResult[]>("search_city", { query });
        e.results.innerHTML = "";

        if (results.length === 0) {
          const empty = document.createElement("div");
          empty.className = "city-result-item";
          empty.style.color = "var(--text-muted)";
          empty.textContent = "No matching city";
          e.results.appendChild(empty);
        } else {
          results.forEach((city) => {
            const item = document.createElement("div");
            item.className = "city-result-item";

            const name = document.createElement("div");
            name.className = "city-name";
            name.textContent = city.name;
            item.appendChild(name);

            const detail = document.createElement("div");
            detail.className = "city-detail";
            detail.textContent = [city.admin1, city.country].filter(Boolean).join(", ");
            item.appendChild(detail);

            item.addEventListener("click", async () => {
              await invoke("save_weather_city", {
                city: city.name,
                lat: city.latitude,
                lon: city.longitude,
              });
              renderCity(city.name);
              e.search.value = "";
              e.results.classList.remove("active");
              e.results.innerHTML = "";
              showStatus(`weather city set to ${city.name}`);
            });

            e.results.appendChild(item);
          });
        }

        e.results.classList.add("active");
        e.results.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        loge(TAG, "search city failed:", err);
      }
    }, 400);
  });

  document.addEventListener("click", (event) => {
    if (!e.search.contains(event.target as Node) && !e.results.contains(event.target as Node)) {
      e.results.classList.remove("active");
    }
  });

  e.clearBtn.addEventListener("click", async () => {
    await invoke("save_weather_city", { city: "", lat: 0.0, lon: 0.0 });
    renderCity("");
    showStatus("weather city cleared");
  });

  bound = true;
}

export async function initSettingsWeather(): Promise<void> {
  bindEvents();
  await load();
}
