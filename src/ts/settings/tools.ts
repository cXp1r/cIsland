import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { logi } from "../logger";
import type { CheckResult, InstallResult, TestResult, ToolsSettingsResponse } from "./types";
import { configDir } from "./main";
import { get_parent, sanitize } from "./helper";

type ToolName = "aria2c" | "adb" | "hook";

type ModuleUI = {
  name: ToolName;
  installDir: HTMLInputElement;
  path?: HTMLInputElement;
  thread?: HTMLInputElement;
  result: HTMLElement;
  initBtn?: HTMLButtonElement;
  getPathBtn?: HTMLButtonElement;
  testBtn?: HTMLButtonElement;
  checkBtn?: HTMLButtonElement;
  lockInstallDir?: boolean;
};

type ModuleHandlers = Partial<Record<"init" | "getPath" | "test" | "check", (ui: ModuleUI) => Promise<void>>>;

const TAG = "Settings/Tools";
const DEFAULT_SECRET = "灯灯侑侑天下第一";
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let bound = false;
let cache: ToolsSettingsResponse | null = null;

export const moduleUI = {
  aria2c: {
    name: "aria2c",
    installDir: $<HTMLInputElement>("aria2c-install-dir"),
    path: $<HTMLInputElement>("aria2c-path"),
    thread: $<HTMLInputElement>("aria2c-thread"),
    result: $<HTMLElement>("aria2c-check-result"),
    initBtn: $<HTMLButtonElement>("aria2c-init-btn"),
    getPathBtn: $<HTMLButtonElement>("aria2c-get-path-btn"),
    testBtn: $<HTMLButtonElement>("aria2c-test-btn"),
    checkBtn: $<HTMLButtonElement>("aria2c-check-btn"),
  } satisfies ModuleUI,
  adb: {
    name: "adb",
    installDir: $<HTMLInputElement>("adb-install-dir"),
    path: $<HTMLInputElement>("adb-path"),
    result: $<HTMLElement>("adb-check-result"),
    initBtn: $<HTMLButtonElement>("adb-init-btn"),
    getPathBtn: $<HTMLButtonElement>("adb-path-from-path-btn"),
    testBtn: $<HTMLButtonElement>("adb-devices-btn"),
    checkBtn: $<HTMLButtonElement>("adb-check-btn"),
  } satisfies ModuleUI,
  hook: {
    name: "hook",
    installDir: $<HTMLInputElement>("hook-installer-dir"),
    result: $<HTMLElement>("hook-check-result"),
    initBtn: $<HTMLButtonElement>("hook-init-btn"),
    checkBtn: $<HTMLButtonElement>("hook-check-btn"),
    lockInstallDir: true,
  } satisfies ModuleUI,
} as const;

export const aria2cPath = moduleUI.aria2c.path;
export const aria2cThread = moduleUI.aria2c.thread;
export const aria2cRpcPort = $<HTMLInputElement>("aria2c-rpc-port");
export const aria2cRpcSecret = $<HTMLInputElement>("aria2c-rpc-secret");
export const adbPath = moduleUI.adb.path;
export const sadbIpInput = $<HTMLInputElement>("sadb-ip");
export const sadbPortInput = $<HTMLInputElement>("sadb-port");

const adbKillServerBtn = $<HTMLButtonElement>("adb-kill-server-btn");
const adbConnBtn = $<HTMLButtonElement>("adb-connect-device-btn");

function defaultInstallDir(name: ToolName): string {
  return `${configDir}${name === "hook" ? "agent-hooks" : name}`;
}

function readValue(input?: HTMLInputElement): string {
  return input ? input.value.trim() : "";
}

function clampPort(raw: string, fallback: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value >= 65535) return fallback;
  return value;
}

function clampThread(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return 4;
  return Math.min(value, 16);
}

function setResult(el: HTMLElement, text: string, isError = false): void {
  el.textContent = text;
  el.style.color = isError ? "#ff6f7f" : "var(--text)";
}

function setButtonBusy(button: HTMLButtonElement | undefined, busy: boolean, busyText?: string): void {
  if (!button) return;
  button.disabled = busy;
  if (busyText !== undefined) button.textContent = busyText;
}

function bindModule(ui: ModuleUI, handlers: ModuleHandlers): void {
  if (!ui.lockInstallDir) {
    ui.installDir.addEventListener("input", () => {
      ui.installDir.value = sanitize(ui.installDir.value);
    });
  }

  ui.initBtn?.addEventListener("click", () => void handlers.init?.(ui));
  ui.getPathBtn?.addEventListener("click", () => void handlers.getPath?.(ui));
  ui.testBtn?.addEventListener("click", () => void handlers.test?.(ui));
  ui.checkBtn?.addEventListener("click", () => void handlers.check?.(ui));
}

function displayName(name: ToolName): string {
  return name === "adb" ? "ADB" : name.toUpperCase();
}

async function handleInstall(ui: ModuleUI): Promise<void> {
  const installDir = readValue(ui.installDir);
  const label = displayName(ui.name);

  if (!installDir) {
    setResult(ui.result, `Please set ${label} install dir first.`, true);
    showStatus(`Please set ${label} install dir first.`, true);
    return;
  }

  setButtonBusy(ui.initBtn, true);

  try {
    const result = await invoke<InstallResult>("tools_downloader", {
      idir: installDir,
      name: ui.name,
    });

    if (ui.path) ui.path.value = result.path;
    setResult(ui.result, `Initialized\nInstall dir: ${result.install_dir}\nPath: ${result.path}`);
    showStatus(`${label} initialized. Save settings to keep it.`, false, 5000);
  } catch (e) {
    setResult(ui.result, `Init failed: ${String(e)}`, true);
    showStatus(`${label} init failed: ${String(e)}`, true, 7000);
  } finally {
    setButtonBusy(ui.initBtn, false);
  }
}

async function handleFindPath(ui: ModuleUI): Promise<void> {
  if (!ui.path) return;

  const originalDisabled = ui.path.disabled;
  ui.path.disabled = true;
  setResult(ui.result, `Searching ${ui.name} from PATH...`);

  try {
    const foundPath = await invoke<string>("find_path_by_where", { name: ui.name });
    ui.path.value = foundPath;
    ui.installDir.value = get_parent(foundPath) || defaultInstallDir(ui.name);
    setResult(ui.result, `Found ${ui.name}\nPath: ${foundPath}`);
    showStatus(`Found ${ui.name} from PATH. Save settings to keep it.`, false, 5000);
  } catch (e) {
    setResult(ui.result, `PATH search failed: ${String(e)}`, true);
    showStatus(`PATH search failed for ${ui.name}: ${String(e)}`, true, 6000);
  } finally {
    ui.path.disabled = originalDisabled;
  }
}

async function handleTest(ui: ModuleUI): Promise<void> {
  const path = readValue(ui.path);
  if (!path) {
    setResult(ui.result, `Please set ${ui.name} executable path first.`, true);
    return;
  }

  setButtonBusy(ui.testBtn, true);
  setResult(ui.result, `Testing ${ui.name}...`);

  try {
    const testOpt = await invoke<TestResult>("test", { path, tag: ui.name });
    setResult(
      ui.result,
      [
        testOpt.ok ? "Command passed" : "Command failed",
        testOpt.stdout.trim() ? `stdout:\n${testOpt.stdout.trim()}` : "",
        testOpt.stderr.trim() ? `stderr:\n${testOpt.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"),
      !testOpt.ok
    );
  } catch (e) {
    setResult(ui.result, `Test failed: ${String(e)}`, true);
  } finally {
    setButtonBusy(ui.testBtn, false);
  }
}

async function handleCheck(ui: ModuleUI): Promise<void> {
  const path = readValue(ui.path);
  if (!path) {
    setResult(ui.result, `Please set ${ui.name} executable path first.`, true);
    return;
  }

  setButtonBusy(ui.checkBtn, true);
  setResult(ui.result, `Checking ${ui.name} version...`);

  try {
    const checkOpt = await invoke<CheckResult>("check", { path, tag: ui.name });
    setResult(
      ui.result,
      [
        checkOpt.ok ? "Command passed" : "Command failed",
        `Version: ${checkOpt.version || "unknown"}`,
        checkOpt.stdout.trim() ? `stdout:\n${checkOpt.stdout.trim()}` : "",
        checkOpt.stderr.trim() ? `stderr:\n${checkOpt.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"),
      !checkOpt.ok
    );
  } catch (e) {
    setResult(ui.result, `Check failed: ${String(e)}`, true);
  } finally {
    setButtonBusy(ui.checkBtn, false);
  }
}

function bindToolsModules(): void {
  bindModule(moduleUI.aria2c, {
    init: handleInstall,
    getPath: handleFindPath,
    test: handleTest,
    check: handleCheck,
  });

  bindModule(moduleUI.adb, {
    init: handleInstall,
    getPath: handleFindPath,
    test: handleTest,
    check: handleCheck,
  });

  bindModule(moduleUI.hook, {
    check: async (ui) => {
      const installDir = readValue(ui.installDir) || defaultInstallDir("hook");
      setResult(ui.result, `Global install dir: ${installDir}\nIPC Helper: ${installDir}\\agent-hooks-ipc.exe`);
      showStatus("Hook install dir shown.", false, 4000);
    },
  });

  bound = true;
}

function bindAdbActions(): void {
  adbConnBtn.addEventListener("click", async () => {
    const ip = sadbIpInput.value.trim();
    const port = clampPort(sadbPortInput.value, 5555);
    const serial = `${ip}:${port}`;
    const originalText = adbConnBtn.textContent || "connect";

    if (!ip) {
      setResult(moduleUI.adb.result, "Please set default IP first.", true);
      showStatus("Please set default IP first.", true);
      return;
    }

    adbConnBtn.disabled = true;
    adbConnBtn.textContent = "connecting...";
    setResult(moduleUI.adb.result, `Connecting ${serial}...`);

    try {
      await invoke<TestResult>("custom_caller", {
        path: adbPath.value,
        args: ["connect", serial],
      });
      setResult(moduleUI.adb.result, `Device connected\nSerial: ${serial}\nADB: ${adbPath.value}`);
      showStatus(`Device connected: ${serial}`, false, 4500);
    } catch (e) {
      setResult(moduleUI.adb.result, `Device connect failed\nSerial: ${serial}\nError: ${String(e)}`, true);
      showStatus(`Device connect failed: ${String(e)}`, true, 6000);
    } finally {
      adbConnBtn.disabled = false;
      adbConnBtn.textContent = originalText;
    }
  });

  adbKillServerBtn.addEventListener("click", async () => {
    const originalText = adbKillServerBtn.textContent || "kill server";

    adbKillServerBtn.disabled = true;
    adbKillServerBtn.textContent = "running...";
    setResult(moduleUI.adb.result, "Running adb kill-server...");

    try {
      const result = await invoke<TestResult>("custom_caller", {
        path: adbPath.value,
        args: ["kill-server"],
      });
      setResult(
        moduleUI.adb.result,
        [
          result.ok ? "ADB server stopped" : "ADB server stop failed",
          result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
          result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
        ].filter(Boolean).join("\n"),
        !result.ok
      );
      showStatus(result.ok ? "ADB server stopped" : "ADB server stop failed", !result.ok, 4500);
    } catch (e) {
      setResult(moduleUI.adb.result, `Kill server failed: ${String(e)}`, true);
      showStatus(`Kill server failed: ${String(e)}`, true, 6000);
    } finally {
      adbKillServerBtn.disabled = false;
      adbKillServerBtn.textContent = originalText;
    }
  });
}

export function initTools(): void {
  if (bound) return;
  bindToolsModules();
  bindAdbActions();
  $<HTMLButtonElement>("save-btn").addEventListener("click", () => {
    if (document.getElementById("page-tools")?.classList.contains("active")) {
      void save();
    }
  });
}

export function loadTools(r: ToolsSettingsResponse): void {
  logi(TAG, "tools settings loaded:", r);

  const adbParent = get_parent(r.adb_path);
  const aria2cParent = get_parent(r.aria2c_path);

  moduleUI.adb.path.value = r.adb_path;
  moduleUI.adb.installDir.value = adbParent || defaultInstallDir("adb");

  moduleUI.aria2c.path.value = r.aria2c_path;
  moduleUI.aria2c.installDir.value = aria2cParent || defaultInstallDir("aria2c");
  moduleUI.aria2c.thread.value = String(r.aria2c_thread);

  aria2cRpcPort.value = String(r.aria2c_rpc_port);
  aria2cRpcSecret.value = r.aria2c_rpc_secret === DEFAULT_SECRET ? "" : r.aria2c_rpc_secret;

  moduleUI.hook.installDir.value = defaultInstallDir("hook");
  moduleUI.hook.installDir.readOnly = true;
}

export function getToolsPayload() {
  return {
    sadbIp: sadbIpInput.value.trim(),
    sadbPort: clampPort(sadbPortInput.value, 5555),
    adbPath: adbPath.value,
    aria2cPath: aria2cPath.value,
    aria2cThread: clampThread(aria2cThread.value),
    aria2cRpcPort: clampPort(aria2cRpcPort.value, 6800),
    aria2cRpcSecret: aria2cRpcSecret.value.trim() || DEFAULT_SECRET,
  };
}

function readCurrent(): ToolsSettingsResponse {
  return {
    adb_path: adbPath.value,
    aria2c_path: aria2cPath.value,
    aria2c_thread: clampThread(aria2cThread.value),
    aria2c_rpc_port: clampPort(aria2cRpcPort.value, 6800),
    aria2c_rpc_secret: aria2cRpcSecret.value.trim() || DEFAULT_SECRET,
  };
}

function isEqual(a: ToolsSettingsResponse, b: ToolsSettingsResponse): boolean {
  return a.adb_path === b.adb_path
    && a.aria2c_path === b.aria2c_path
    && a.aria2c_thread === b.aria2c_thread
    && a.aria2c_rpc_port === b.aria2c_rpc_port
    && a.aria2c_rpc_secret === b.aria2c_rpc_secret;
}

async function save(): Promise<void> {
  const current = readCurrent();
  if (cache && isEqual(current, cache)) return;

  try {
    await invoke("save_settings", {
      adbPath: current.adb_path,
      aria2cPath: current.aria2c_path,
      aria2cThread: current.aria2c_thread,
      aria2cRpcPort: current.aria2c_rpc_port,
      aria2cRpcSecret: current.aria2c_rpc_secret,
    });
    cache = current;
    showStatus("璁剧疆宸蹭繚瀛?");
  } catch (e) {
    showStatus(`淇濆瓨澶辫触: ${String(e)}`, true, 4500);
  }
}

export async function initSettingsTools(): Promise<void> {
  if (!cache) {
    const settings = await invoke<{ tools: ToolsSettingsResponse }>("get_settings");
    cache = settings.tools;
    initTools();
  }
  loadTools(cache);
}
