import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./settings-shared";
import type { AdbCheckResult, AdbDevicesResult, AdbCommandResult, InstallResult, AdbPathResult } from "./types";

const sadbIpInput = document.getElementById("sadb-ip") as HTMLInputElement;
const sadbPortInput = document.getElementById("sadb-port") as HTMLInputElement;


export function getAdbValues() {
  return {
    sadbIp: sadbIpInput.value.trim(),
    sadbPort: parseInt(sadbPortInput.value) || 5555,
  }
}

function resolveAdbPathForCommand(): string | null {
  const adbPath = adbPathInput.value.trim();
  return adbPath || null;
}

function setAdbResult(text: string, isError = false) {
  adbCheckResult.textContent = text;
  adbCheckResult.style.color = isError ? "#ff6f7f" : "var(--text)";
}

export async function initAdbPathAutoFill(): Promise<void> {
  if (!adbPathInput.value.trim()) {
    try {
      const result = await invoke<AdbPathResult>("tools_find_adb_in_path");
      adbPathInput.value = result.adb_path;
      setAdbResult(`已从系统 PATH 自动找到 ADB: ${result.adb_path}`);
    } catch {
      setAdbResult("未配置 ADB 路径，可留空使用系统 PATH，或点击「从 PATH 获取」。");
    }
  }
}

export function initAdb(): void {
  adbInitBtn.addEventListener("click", async () => {
    const installDir = adbInstallDirInput.value.trim();
    const originalText = adbInitBtn.textContent || "初始化 ADB";

    if (!installDir) {
      setAdbResult("请先填写 ADB 工具安装目录。", true);
      showStatus("请先填写 ADB 工具安装目录", true);
      return;
    }

    adbInitBtn.disabled = true;
    adbInitBtn.textContent = "初始化中...";
    setAdbResult("正在下载 Android platform-tools 并解压，请稍候...");

    try {
      const result = await invoke<InstallResult>("tools_download_and_install_adb", {
        installDir,
      });
      adbInstallDirInput.value = result.install_dir;
      adbPathInput.value = result.path;
      setAdbResult([
        "初始化完成",
        `安装目录: ${result.install_dir}`,
        `ADB 路径: ${result.path}`,
        `下载文件: ${result.downloaded_zip}`,
        "请点击「保存设置」保留该配置。",
      ].join("\n"));
      showStatus("ADB 初始化完成，请保存设置", false, 5000);
    } catch (e) {
      setAdbResult(`初始化失败: ${String(e)}`, true);
      showStatus(`ADB 初始化失败: ${String(e)}`, true, 7000);
    } finally {
      adbInitBtn.disabled = false;
      adbInitBtn.textContent = originalText;
    }
  });

  adbPathFromPathBtn.addEventListener("click", async () => {
    const originalText = adbPathFromPathBtn.textContent || "从 PATH 获取";
    adbPathFromPathBtn.disabled = true;
    adbPathFromPathBtn.textContent = "查找中...";
    setAdbResult("正在从系统 PATH 查找 adb...");

    try {
      const adb_path = await invoke<string>("find_path_by_where", {name: "adb"});
      adbPathInput.value = adb_path;
      setAdbResult([
        "已从 PATH 找到 ADB",
        `ADB 路径: ${adb_path}`,
        "请点击「保存设置」保留该配置。",
      ].join("\n"));
      showStatus("已从 PATH 获取 ADB 路径，请保存设置", false, 5000);
    } catch (e) {
      setAdbResult(`从 PATH 获取失败: ${String(e)}`, true);
      showStatus(`从 PATH 获取 ADB 失败: ${String(e)}`, true, 6000);
    } finally {
      adbPathFromPathBtn.disabled = false;
      adbPathFromPathBtn.textContent = originalText;
    }
  });

  adbCheckBtn.addEventListener("click", async () => {
    const originalText = adbCheckBtn.textContent || "命令检验";
    adbCheckBtn.disabled = true;
    adbCheckBtn.textContent = "检测中...";
    setAdbResult("正在执行 adb version...");

    try {
      const result = await invoke<AdbCheckResult>("tools_check_adb", {
        adbPath: resolveAdbPathForCommand(),
      });
      setAdbResult([
        result.ok ? "命令检验通过" : "命令执行失败",
        `ADB 路径: ${result.adb_path}`,
        `版本: ${result.version || "未知"}`,
        result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
        result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"));
      showStatus(result.ok ? "ADB 命令检验通过" : "ADB 命令执行失败", !result.ok, 4500);
    } catch (e) {
      setAdbResult(`命令检验失败: ${String(e)}`, true);
      showStatus(`ADB 命令检验失败: ${String(e)}`, true, 6000);
    } finally {
      adbCheckBtn.disabled = false;
      adbCheckBtn.textContent = originalText;
    }
  });

  adbDevicesBtn.addEventListener("click", async () => {
    const originalText = adbDevicesBtn.textContent || "设备检验";
    adbDevicesBtn.disabled = true;
    adbDevicesBtn.textContent = "检测中...";
    setAdbResult("正在执行 adb devices...");

    try {
      const result = await invoke<AdbDevicesResult>("tools_check_adb_devices", {
        adbPath: resolveAdbPathForCommand(),
      });
      const deviceLines = result.devices.length > 0
        ? result.devices.map((device) => `${device.serial}  ${device.state}`)
        : ["未发现设备"];
      setAdbResult([
        result.ok ? "设备检验完成" : "设备检验执行失败",
        `ADB 路径: ${result.adb_path}`,
        "设备列表:",
        ...deviceLines,
        result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
        result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"), !result.ok);
      showStatus(result.devices.length > 0 ? `发现 ${result.devices.length} 个设备` : "未发现 ADB 设备", false, 4500);
    } catch (e) {
      setAdbResult(`设备检验失败: ${String(e)}`, true);
      showStatus(`ADB 设备检验失败: ${String(e)}`, true, 6000);
    } finally {
      adbDevicesBtn.disabled = false;
      adbDevicesBtn.textContent = originalText;
    }
  });

  adbConnectDeviceBtn.addEventListener("click", async () => {
    const ip = sadbIpInput.value.trim();
    const port = parseInt(sadbPortInput.value) || 5555;
    const serial = `${ip}:${port}`;
    const originalText = adbConnectDeviceBtn.textContent || "连接设备";

    if (!ip) {
      setAdbResult("请先填写默认 IP 地址。", true);
      showStatus("请先填写默认 IP 地址", true);
      return;
    }

    if (port < 1 || port > 65535) {
      setAdbResult("端口范围应为 1-65535。", true);
      showStatus("ADB WiFi 端口范围应为 1-65535", true);
      return;
    }

    adbConnectDeviceBtn.disabled = true;
    adbConnectDeviceBtn.textContent = "连接中...";
    setAdbResult(`正在连接设备 ${serial}...`);

    try {
      await invoke("sadb_connect_device", {
        serial,
        adbPath: resolveAdbPathForCommand(),
      });
      setAdbResult([
        "设备连接成功",
        `设备地址: ${serial}`,
        `ADB 路径: ${resolveAdbPathForCommand() || "adb"}`,
      ].join("\n"));
      showStatus(`设备连接成功: ${serial}`, false, 4500);
    } catch (e) {
      setAdbResult([
        "设备连接失败",
        `设备地址: ${serial}`,
        `错误: ${String(e)}`,
      ].join("\n"), true);
      showStatus(`设备连接失败: ${String(e)}`, true, 6000);
    } finally {
      adbConnectDeviceBtn.disabled = false;
      adbConnectDeviceBtn.textContent = originalText;
    }
  });

  adbKillServerBtn.addEventListener("click", async () => {
    const originalText = adbKillServerBtn.textContent || "Kill Server";
    adbKillServerBtn.disabled = true;
    adbKillServerBtn.textContent = "执行中...";
    setAdbResult("正在执行 adb kill-server...");

    try {
      const result = await invoke<AdbCommandResult>("tools_kill_adb_server", {
        adbPath: resolveAdbPathForCommand(),
      });
      setAdbResult([
        result.ok ? "ADB Server 已停止" : "ADB Server 停止失败",
        `ADB 路径: ${result.adb_path}`,
        result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
        result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      ].filter(Boolean).join("\n"), !result.ok);
      showStatus(result.ok ? "ADB Server 已停止" : "ADB Server 停止失败", !result.ok, 4500);
    } catch (e) {
      setAdbResult(`Kill Server 失败: ${String(e)}`, true);
      showStatus(`Kill Server 失败: ${String(e)}`, true, 6000);
    } finally {
      adbKillServerBtn.disabled = false;
      adbKillServerBtn.textContent = originalText;
    }
  });
}
