import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./settings-shared";
import { loge } from "../index/logger";
import type { CityResult } from "./types";

const TAG = "Settings/Weather";

const weatherCitySearch = document.getElementById("weather-city-search") as HTMLInputElement;
const cityResultsEl = document.getElementById("city-results") as HTMLDivElement;
const cityCurrent = document.getElementById("city-current") as HTMLDivElement;
const cityTag = document.getElementById("city-tag") as HTMLSpanElement;
const clearCityBtn = document.getElementById("clear-city-btn") as HTMLButtonElement;

let citySearchTimer: number | null = null;

export function setWeatherCity(name: string) {
  if (name) {
    cityTag.textContent = name;
    cityCurrent.style.display = "flex";
  } else {
    cityCurrent.style.display = "none";
  }
}

export function initWeather(): void {
  weatherCitySearch.addEventListener("input", () => {
    if (citySearchTimer) {
      clearTimeout(citySearchTimer);
    }
    const query = weatherCitySearch.value.trim();
    if (!query) {
      cityResultsEl.classList.remove("active");
      cityResultsEl.innerHTML = "";
      return;
    }
    citySearchTimer = window.setTimeout(async () => {
      try {
        const results = await invoke<CityResult[]>("search_city", { query });
        cityResultsEl.innerHTML = "";
        if (results.length === 0) {
          const empty = document.createElement("div");
          empty.className = "city-result-item";
          empty.style.color = "var(--text-muted)";
          empty.textContent = "未找到匹配城市";
          cityResultsEl.appendChild(empty);
        } else {
          results.forEach((city) => {
            const item = document.createElement("div");
            item.className = "city-result-item";
            const nameDiv = document.createElement("div");
            nameDiv.className = "city-name";
            nameDiv.textContent = city.name;
            item.appendChild(nameDiv);
            const detailDiv = document.createElement("div");
            detailDiv.className = "city-detail";
            detailDiv.textContent = [city.admin1, city.country].filter(Boolean).join(", ");
            item.appendChild(detailDiv);
            item.addEventListener("click", async () => {
              await invoke("save_weather_city", {
                city: city.name,
                lat: city.latitude,
                lon: city.longitude,
              });
              setWeatherCity(city.name);
              weatherCitySearch.value = "";
              cityResultsEl.classList.remove("active");
              cityResultsEl.innerHTML = "";
              showStatus(`天气位置已设置为 ${city.name}`);
            });
            cityResultsEl.appendChild(item);
          });
        }
        cityResultsEl.classList.add("active");
        cityResultsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (e) {
        loge(TAG, "search city failed:", e);
      }
    }, 400);
  });

  document.addEventListener("click", (e) => {
    if (!weatherCitySearch.contains(e.target as Node) && !cityResultsEl.contains(e.target as Node)) {
      cityResultsEl.classList.remove("active");
    }
  });

  clearCityBtn.addEventListener("click", async () => {
    await invoke("save_weather_city", { city: "", lat: 0.0, lon: 0.0 });
    cityCurrent.style.display = "none";
    cityTag.textContent = "";
    showStatus("已清除天气位置，将使用自动定位");
  });
}
