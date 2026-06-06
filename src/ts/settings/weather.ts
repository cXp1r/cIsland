import { invoke } from "@tauri-apps/api/core";
import { loge } from "../index/logger";
import { $, showStatus } from "./shared";
import type { CityResult } from "./types";

const TAG = "Settings/Weather";
const els = {
  search: $<HTMLInputElement>("weather-city-search"),
  results: $<HTMLDivElement>("city-results"),
  current: $<HTMLDivElement>("city-current"),
  tag: $<HTMLSpanElement>("city-tag"),
  clearBtn: $<HTMLButtonElement>("clear-city-btn"),
};

let citySearchTimer: number | null = null;
let bound = false;

function renderCity(name: string): void {
  if (name) {
    els.tag.textContent = name;
    els.current.style.display = "flex";
  } else {
    els.tag.textContent = "";
    els.current.style.display = "none";
  }
}

async function load(): Promise<void> {
  const settings = await invoke<{ weather_city: string }>("get_settings");
  renderCity(settings.weather_city || "");
}

function bindEvents(): void {
  if (bound) return;

  els.search.addEventListener("input", () => {
    if (citySearchTimer) clearTimeout(citySearchTimer);
    const query = els.search.value.trim();

    if (!query) {
      els.results.classList.remove("active");
      els.results.innerHTML = "";
      return;
    }

    citySearchTimer = window.setTimeout(async () => {
      try {
        const results = await invoke<CityResult[]>("search_city", { query });
        els.results.innerHTML = "";

        if (results.length === 0) {
          const empty = document.createElement("div");
          empty.className = "city-result-item";
          empty.style.color = "var(--text-muted)";
          empty.textContent = "No matching city";
          els.results.appendChild(empty);
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
              els.search.value = "";
              els.results.classList.remove("active");
              els.results.innerHTML = "";
              showStatus(`weather city set to ${city.name}`);
            });

            els.results.appendChild(item);
          });
        }

        els.results.classList.add("active");
        els.results.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        loge(TAG, "search city failed:", err);
      }
    }, 400);
  });

  document.addEventListener("click", (event) => {
    if (!els.search.contains(event.target as Node) && !els.results.contains(event.target as Node)) {
      els.results.classList.remove("active");
    }
  });

  els.clearBtn.addEventListener("click", async () => {
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
