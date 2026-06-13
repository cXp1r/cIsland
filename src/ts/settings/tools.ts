import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./shared";
import { $ } from "../shared";
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

const aria2cPath = moduleUI.aria2c.path;
const aria2cThread = moduleUI.aria2c.thread;
const aria2cRpcPort = $<HTMLInputElement>("aria2c-rpc-port");
const aria2cRpcSecret = $<HTMLInputElement>("aria2c-rpc-secret");
const adbPath = moduleUI.adb.path;
const sadbIpInput = $<HTMLInputElement>("sadb-ip");

const pageTools = $<HTMLElement>("page-tools");
const saveBtn = $<HTMLButtonElement>("save-btn");
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
    setResult(ui.result, `请先设置 ${label} 安装目录。`, true);
    showStatus(`请先设置 ${label} 安装目录。`, true);
    return;
  }

  setButtonBusy(ui.initBtn, true);

  try {
    const result = await invoke<InstallResult>("tools_downloader", {
      idir: installDir,
      name: ui.name,
    });

    if (ui.path) ui.path.value = result.path;
    setResult(ui.result, `初始化完成\n安装目录: ${result.install_dir}\n路径: ${result.path}`);
    showStatus(`${label} 初始化完成，保存设置后生效。`, false, 5000);
  } catch (e) {
    setResult(ui.result, `初始化失败: ${String(e)}`, true);
    showStatus(`${label} 初始化失败: ${String(e)}`, true, 7000);
  } finally {
    setButtonBusy(ui.initBtn, false);
  }
}

async function handleFindPath(ui: ModuleUI): Promise<void> {
  if (!ui.path) return;

  const originalDisabled = ui.path.disabled;
  ui.path.disabled = true;
  setResult(ui.result, `正在从 PATH 查找 ${ui.name}...`);

  try {
    const foundPath = await invoke<string>("find_path_by_where", { name: ui.name });
    ui.path.value = foundPath;
    ui.installDir.value = get_parent(foundPath) || defaultInstallDir(ui.name);
    setResult(ui.result, `已找到 ${ui.name}\n路径: ${foundPath}`);
    showStatus(`已从 PATH 找到 ${ui.name}，保存设置后生效。`, false, 5000);
  } catch (e) {
    setResult(ui.result, `PATH 查找失败: ${String(e)}`, true);
    showStatus(`${ui.name} PATH 查找失败: ${String(e)}`, true, 6000);
  } finally {
    ui.path.disabled = originalDisabled;
  }
}

async function handleTest(ui: ModuleUI): Promise<void> {
  const path = readValue(ui.path);
  if (!path) {
    setResult(ui.result, `请先设置 ${ui.name} 可执行文件路径。`, true);
    return;
  }

  setButtonBusy(ui.testBtn, true);
  setResult(ui.result, `正在测试 ${ui.name}...`);

  try {
    const testOpt = await invoke<TestResult>("test", { path, tag: ui.name });
    setResult(
      ui.result,
      [
        testOpt.ok ? "命令执行成功" : "命令执行失败",
        testOpt.stdout.trim() ? `stdout:\n${testOpt.stdout.trim()}` : "",
        testOpt.stderr.trim() ? `stderr:\n${testOpt.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"),
      !testOpt.ok
    );
  } catch (e) {
    setResult(ui.result, `测试失败: ${String(e)}`, true);
  } finally {
    setButtonBusy(ui.testBtn, false);
  }
}

async function handleCheck(ui: ModuleUI): Promise<void> {
  const path = readValue(ui.path);
  if (!path) {
    setResult(ui.result, `请先设置 ${ui.name} 可执行文件路径。`, true);
    return;
  }

  setButtonBusy(ui.checkBtn, true);
  setResult(ui.result, `正在检查 ${ui.name} 版本...`);

  try {
    const checkOpt = await invoke<CheckResult>("check", { path, tag: ui.name });
    setResult(
      ui.result,
      [
        checkOpt.ok ? "命令执行成功" : "命令执行失败",
        `版本: ${checkOpt.version || "未知"}`,
        checkOpt.stdout.trim() ? `stdout:\n${checkOpt.stdout.trim()}` : "",
        checkOpt.stderr.trim() ? `stderr:\n${checkOpt.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"),
      !checkOpt.ok
    );
  } catch (e) {
    setResult(ui.result, `检查失败: ${String(e)}`, true);
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
    init: handleInstall,
    check: async (ui) => {
      const installDir = readValue(ui.installDir) || defaultInstallDir("hook");
      setResult(ui.result, `全局安装目录: ${installDir}\nIPC 助手: ${installDir}\\cc-hook-core.exe`);
      showStatus("Hook 安装目录已显示。", false, 4000);
    },
  });
}

function bindAdbActions(): void {
  adbConnBtn.addEventListener("click", async () => {
    const ip = sadbIpInput.value.trim();
    //TODO 搭配mDNS使用
    let port = 55555;
    const serial = `${ip}:${port}`;
    const originalText = adbConnBtn.textContent || "连接";

    if (!ip) {
      setResult(moduleUI.adb.result, "请先设置默认 IP。", true);
      showStatus("请先设置默认 IP。", true);
      return;
    }

    adbConnBtn.disabled = true;
    adbConnBtn.textContent = "连接中...";
    setResult(moduleUI.adb.result, `正在连接 ${serial}...`);

    try {
      await invoke<TestResult>("custom_caller", {
        path: adbPath.value,
        args: ["connect", serial],
      });
      setResult(moduleUI.adb.result, `设备已连接\nSerial: ${serial}\nADB: ${adbPath.value}`);
      showStatus(`设备已连接: ${serial}`, false, 4500);
    } catch (e) {
      setResult(moduleUI.adb.result, `设备连接失败\nSerial: ${serial}\n错误: ${String(e)}`, true);
      showStatus(`设备连接失败: ${String(e)}`, true, 6000);
    } finally {
      adbConnBtn.disabled = false;
      adbConnBtn.textContent = originalText;
    }
  });

  adbKillServerBtn.addEventListener("click", async () => {
    const originalText = adbKillServerBtn.textContent || "停止服务";

    adbKillServerBtn.disabled = true;
    adbKillServerBtn.textContent = "执行中...";
    setResult(moduleUI.adb.result, "正在执行 adb kill-server...");

    try {
      const result = await invoke<TestResult>("custom_caller", {
        path: adbPath.value,
        args: ["kill-server"],
      });
      setResult(
        moduleUI.adb.result,
        [
          result.ok ? "ADB 服务已停止" : "ADB 服务停止失败",
          result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
          result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
        ].filter(Boolean).join("\n"),
        !result.ok
      );
      showStatus(result.ok ? "ADB 服务已停止" : "ADB 服务停止失败", !result.ok, 4500);
    } catch (e) {
      setResult(moduleUI.adb.result, `停止服务失败: ${String(e)}`, true);
      showStatus(`停止服务失败: ${String(e)}`, true, 6000);
    } finally {
      adbKillServerBtn.disabled = false;
      adbKillServerBtn.textContent = originalText;
    }
  });
}

function bindOpenFolderButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".open-folder-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const inputId = button.dataset.id;
      const input = inputId ? document.getElementById(inputId) : null;

      if (!(input instanceof HTMLInputElement)) {
        showStatus("未找到绑定的输入框。", true, 4000);
        return;
      }

      try {
        const selected = await invoke<string | null>("select_folder", {
          defaultDir: input.value.trim() || null,
        });

        if (!selected) return;
        const snap = input.value;
        input.value = selected;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        if (snap != selected) {
          showStatus("新下载目录已选择, 点击初始化开始下载", false, 4000);
        } else {
          showStatus("无变化", false, 4000);
        }
        logi(TAG, "folder selected:", inputId, selected);
      } catch (e) {
        showStatus(`选择目录失败: ${String(e)}`, true, 5000);
      }
    });
  });
}

export function initTools(): void {
  if (bound) return;
  bindToolsModules();
  bindAdbActions();
  bindOpenFolderButtons();
  saveBtn.addEventListener("click", () => {
    if (pageTools.classList.contains("active")) {
      void save();
    }
  });
  bound = true;
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

function readCurrent(): ToolsSettingsResponse {
  return {
    adb_path: adbPath.value,
    aria2c_path: aria2cPath.value,
    aria2c_thread: clampThread(aria2cThread.value),
    aria2c_rpc_port: clampPort(aria2cRpcPort.value, 6800),
    aria2c_rpc_secret: aria2cRpcSecret.value.trim() || DEFAULT_SECRET,
    sadb_ip: sadbIpInput.value,
  };
}

function isEqual(a: ToolsSettingsResponse, b: ToolsSettingsResponse): boolean {
  return a.adb_path === b.adb_path
    && a.aria2c_path === b.aria2c_path
    && a.aria2c_thread === b.aria2c_thread
    && a.aria2c_rpc_port === b.aria2c_rpc_port
    && a.aria2c_rpc_secret === b.aria2c_rpc_secret
    && a.sadb_ip === b.sadb_ip;
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
      sadbIp: current.sadb_ip
    });
    cache = current;
    showStatus("保存成功");
  } catch (e) {
    showStatus(`保存失败: ${String(e)}`, true, 4500);
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
