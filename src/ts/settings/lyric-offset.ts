import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type PlayerOffsetEntry = {
  app_id: string;
  ms: number;
};

type LyricOffsetState = {
  enabled: boolean;
  active_app_id: string | null;
  min_ms: number;
  max_ms: number;
  step_ms: number;
  players: PlayerOffsetEntry[];
};

type Refs = {
  mainToggle: HTMLInputElement;
  subToggle: HTMLInputElement;
  listEl: HTMLDivElement;
  emptyEl: HTMLDivElement;
  statusEl: HTMLSpanElement;
};

const DEFAULT_STEP_MS = 500;
const DEFAULT_MIN_MS = -3000;
const DEFAULT_MAX_MS = 3000;

const refs: Refs = {
  mainToggle: document.getElementById("lyric-offset-enabled") as HTMLInputElement,
  subToggle: document.getElementById("lyric-offset-enabled-sub") as HTMLInputElement,
  listEl: document.getElementById("lyric-offset-list") as HTMLDivElement,
  emptyEl: document.getElementById("lyric-offset-empty") as HTMLDivElement,
  statusEl: document.getElementById("lyric-offset-status") as HTMLSpanElement,
};

const state = {
  enabled: true,
  activeAppId: null as string | null,
  minMs: DEFAULT_MIN_MS,
  maxMs: DEFAULT_MAX_MS,
  stepMs: DEFAULT_STEP_MS,
  players: [] as PlayerOffsetEntry[],
};

let bound = false;

function formatMs(ms: number): string {
  if (ms > 0) return `+${ms} ms`;
  return `${ms} ms`;
}

function clampToRange(ms: number): number {
  const step = state.stepMs || DEFAULT_STEP_MS;
  const min = state.minMs ?? DEFAULT_MIN_MS;
  const max = state.maxMs ?? DEFAULT_MAX_MS;
  const clamped = Math.min(max, Math.max(min, ms));
  return Math.round(clamped / step) * step;
}

function setSubpageStatus(text: string, durationMs = 2000): void {
  refs.statusEl.textContent = text;
  if (durationMs <= 0) return;

  const current = text;
  setTimeout(() => {
    if (refs.statusEl.textContent === current) refs.statusEl.textContent = "";
  }, durationMs);
}

function syncToggles(): void {
  refs.mainToggle.checked = state.enabled;
  refs.subToggle.checked = state.enabled;
}

function renderList(): void {
  refs.listEl.innerHTML = "";

  if (state.players.length === 0) {
    refs.emptyEl.style.display = "block";
    return;
  }

  refs.emptyEl.style.display = "none";
  for (const entry of state.players) {
    refs.listEl.appendChild(buildRow(entry));
  }
}

function buildRow(entry: PlayerOffsetEntry): HTMLDivElement {
  const row = document.createElement("div");
  const label = document.createElement("div");
  const name = document.createElement("span");
  const controls = document.createElement("div");
  const minusBtn = document.createElement("button");
  const plusBtn = document.createElement("button");
  const value = document.createElement("span");
  const delBtn = document.createElement("button");

  row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface);border-radius:8px;gap:12px;";
  label.style.cssText = "display:flex;align-items:center;gap:8px;min-width:0;flex:1;";
  name.textContent = entry.app_id;
  name.style.cssText = "font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  controls.style.cssText = "display:flex;align-items:center;gap:8px;";

  label.appendChild(name);

  if (state.activeAppId && entry.app_id === state.activeAppId) {
    const badge = document.createElement("span");
    badge.textContent = "Current";
    badge.style.cssText = "font-size:11px;padding:2px 8px;border-radius:10px;background:var(--primary);color:#fff;";
    label.appendChild(badge);
  }

  minusBtn.type = "button";
  minusBtn.className = "btn btn-small";
  minusBtn.textContent = "- 0.5s";
  plusBtn.type = "button";
  plusBtn.className = "btn btn-small";
  plusBtn.textContent = "+ 0.5s";
  value.textContent = formatMs(entry.ms);
  value.style.cssText = "min-width:80px;text-align:center;font-variant-numeric:tabular-nums;";
  delBtn.type = "button";
  delBtn.className = "btn btn-small";
  delBtn.textContent = "Clear";
  delBtn.style.color = "var(--danger, #ff6f7f)";
  delBtn.title = "Remove this player's lyric offset";

  const applyDisabledByRange = (nextMs: number): void => {
    minusBtn.disabled = nextMs <= state.minMs;
    plusBtn.disabled = nextMs >= state.maxMs;
  };

  const adjust = async (delta: number): Promise<void> => {
    const next = clampToRange(entry.ms + delta);
    if (next === entry.ms) return;

    const prev = entry.ms;
    entry.ms = next;
    value.textContent = formatMs(next);
    minusBtn.disabled = true;
    plusBtn.disabled = true;

    try {
      const applied = await invoke<number>("set_lyric_offset_for_player", {
        appId: entry.app_id,
        ms: next,
      });
      entry.ms = applied;
      value.textContent = formatMs(applied);
      setSubpageStatus(`${entry.app_id}: ${formatMs(applied)}`);
    } catch (e) {
      entry.ms = prev;
      value.textContent = formatMs(prev);
      setSubpageStatus(`Save failed: ${String(e)}`, 4000);
    } finally {
      applyDisabledByRange(entry.ms);
    }
  };

  applyDisabledByRange(entry.ms);
  minusBtn.addEventListener("click", () => void adjust(-state.stepMs));
  plusBtn.addEventListener("click", () => void adjust(state.stepMs));
  delBtn.addEventListener("click", async () => {
    delBtn.disabled = true;
    try {
      await invoke("delete_lyric_offset_player", { appId: entry.app_id });
      state.players = state.players.filter((p) => p.app_id !== entry.app_id);
      renderList();
      setSubpageStatus(`${entry.app_id} cleared`);
    } catch (e) {
      setSubpageStatus(`Delete failed: ${String(e)}`, 4000);
    } finally {
      delBtn.disabled = false;
    }
  });

  controls.appendChild(minusBtn);
  controls.appendChild(value);
  controls.appendChild(plusBtn);
  controls.appendChild(delBtn);
  row.appendChild(label);
  row.appendChild(controls);
  return row;
}

async function reload(): Promise<void> {
  try {
    const resp = await invoke<LyricOffsetState>("get_lyric_offset_players");
    state.enabled = !!resp.enabled;
    state.activeAppId = resp.active_app_id ?? null;
    state.minMs = Number.isFinite(resp.min_ms) ? resp.min_ms : DEFAULT_MIN_MS;
    state.maxMs = Number.isFinite(resp.max_ms) ? resp.max_ms : DEFAULT_MAX_MS;
    state.stepMs = Number.isFinite(resp.step_ms) && resp.step_ms > 0 ? resp.step_ms : DEFAULT_STEP_MS;
    state.players = Array.isArray(resp.players)
      ? resp.players
          .filter((p) => p && typeof p.app_id === "string")
          .map((p) => ({ app_id: p.app_id, ms: Number(p.ms) || 0 }))
      : [];
    syncToggles();
    renderList();
  } catch (e) {
    setSubpageStatus(`Load failed: ${String(e)}`, 4000);
  }
}

async function handleToggleChange(enabled: boolean): Promise<void> {
  state.enabled = enabled;
  syncToggles();

  try {
    await invoke("set_lyric_offset_enabled", { enabled });
    setSubpageStatus(enabled ? "Lyric offset enabled" : "Lyric offset disabled");
  } catch (e) {
    state.enabled = !enabled;
    syncToggles();
    setSubpageStatus(`Toggle failed: ${String(e)}`, 4000);
  }
}

export function initSettingsLyricOffset(): void {
  if (!bound) {
    refs.mainToggle.addEventListener("change", () => {
      void handleToggleChange(refs.mainToggle.checked);
    });
    refs.subToggle.addEventListener("change", () => {
      void handleToggleChange(refs.subToggle.checked);
    });
    void listen<{ new_app_id?: string }>("lyric-offset-players-changed", () => {
      void reload();
    });
    void listen<{ app_id?: string }>("lyric-offset-active-player-changed", (evt) => {
      state.activeAppId = evt.payload?.app_id ?? null;
      renderList();
    });
    bound = true;
  }

  void reload();
}
