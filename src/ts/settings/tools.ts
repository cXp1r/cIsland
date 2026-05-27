import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./settings-shared";
import { CheckResult, InstallResult, TestResult, ToolsSettingsResponse } from "./types";
import { initDownloader } from "./downloader";

export const aria2c1 = document.getElementById("aria2c-install-dir") as HTMLInputElement
export const aria2cPath = document.getElementById("aria2c-path") as HTMLInputElement
export const aria2cThread = document.getElementById("aria2c-thread") as HTMLInputElement
const aria2cGetPathBtn = document.getElementById("aria2c-get-path-btn") as HTMLButtonElement
const aria2cInitBtn = document.getElementById("aria2c-init-btn") as HTMLButtonElement
const aria2cCheckBtn = document.getElementById("aria2c-check-btn") as HTMLButtonElement
const aria2cTestBtn = document.getElementById("aria2c-test-btn") as HTMLButtonElement
const aria2cResult = document.getElementById("aria2c-check-result") as HTMLInputElement

export const adb1 = document.getElementById("adb-install-dir") as HTMLInputElement;
export const adbPath = document.getElementById("adb-path") as HTMLInputElement;
const adbGetPathBtn = document.getElementById("adb-path-from-path-btn") as HTMLButtonElement;
const adbInitBtn = document.getElementById("adb-init-btn") as HTMLButtonElement;
const adbCheckBtn = document.getElementById("adb-check-btn") as HTMLButtonElement;
const adbTestBtn = document.getElementById("adb-devices-btn") as HTMLButtonElement;
const adbResult = document.getElementById("adb-check-result") as HTMLInputElement;

export const sadbIpInput = document.getElementById("sadb-ip") as HTMLInputElement;
export const sadbPortInput = document.getElementById("sadb-port") as HTMLInputElement;


const adbKillServerBtn = document.getElementById("adb-kill-server-btn") as HTMLButtonElement;

//需要单独添加
const adbConnBtn = document.getElementById("adb-connect-device-btn") as HTMLButtonElement;
const aria2cRpcPort = document.getElementById("aria2c-rpc-port") as HTMLInputElement;
const aria2cRpcSecret = document.getElementById("aria2c-rpc-secret") as HTMLInputElement;
let WORKSPACE: string | null = null;


const modules = {
    aria2c: {
        installDir: aria2c1,
        initBtn: aria2cInitBtn,
        getPathBtn: aria2cGetPathBtn,
        testBtn: aria2cTestBtn,
        checkBtn: aria2cCheckBtn,
        path: aria2cPath,
        result: aria2cResult,
        name: "aria2c",
    },
    adb: {
        installDir: adb1,
        initBtn: adbInitBtn,
        getPathBtn: adbGetPathBtn,
        testBtn: adbTestBtn,
        checkBtn: adbCheckBtn,
        path: adbPath,
        result: adbResult,
        name: "adb",
    },
};

export function setResult(e: HTMLInputElement, t: string, i = false) {
    e.textContent = t;
    e.style.color = i ? "#ff6f7f" : "var(--text)";
}
function sanitize(v: string) {
    return v.replace(/[^a-zA-Z0-9_/\\\:]/g, "");
}


export function initTools(): void {
    //小巧思
    invoke<ToolsSettingsResponse>('get_tools_settings').then((r) => {
        console.log(r);
        adbPath.value = r.adb_path;
        adb1.value = r.adb_install_dir;
        aria2cPath.value = r.aria2c_path;
        aria2cThread.value = r.aria2c_thread.toString();
        aria2cRpcSecret.value = r.aria2c_rpc_secret === "灯灯侑侑天下第一" ? "" : r.aria2c_rpc_secret;
        aria2cRpcPort.value = r.aria2c_rpc_port.toString()
        initDownloader();
    })

    invoke<string>('get_workspace').then((res) => {
        WORKSPACE = res;
        
        Object.entries(modules).forEach(([name, ui]) => {
            ui.installDir.value = ui.installDir.value == "" ? WORKSPACE + "\\" + ui.name : ui.installDir.value;
            ui.installDir.addEventListener("input", () => {
                ui.installDir.value = sanitize(ui.installDir.value);
            });
            ui.initBtn.addEventListener("click", async () => {
                const installDir = ui.installDir.value.trim();
                
                if (!installDir) {
                    setResult(ui.result, `请先填写 ${ui.name} 工具安装目录。`);
                    showStatus(`请先填写 ${ui.name} 工具安装目录`, true);
                    return;
                }
                
                ui.initBtn.disabled = true;

                try {
                    const result = await invoke<InstallResult>('tools_download_and_install_from_github', {
                        idir: installDir,
                        name: ui.name,
                    });
                    setResult(
                        ui.result,
                        [
                            "初始化完成",
                            `安装目录: ${result.install_dir}`,
                            `${ui.name} 路径: ${result.path}`,
                            "请点击「保存设置」保留该配置。",
                        ].join("\n")
                    );
                    ui.path.value = result.path;
                    showStatus(`${ui.name} 初始化完成，请保存设置`, false, 5000);
                } catch (e) {
                    setResult(ui.result,`初始化失败: ${String(e)}`, true);
                    showStatus(`${ui.name} 初始化失败: ${String(e)}`, true, 7000);
                } finally {
                    ui.initBtn.disabled = false;
                }
            });
            ui.getPathBtn.addEventListener("click", async () => {
                ui.path.disabled = true;

                setResult(
                    ui.result,
                    `正在从系统 PATH 查找 ${ui.name}...`
                );

                try {
                    const foundPath = await invoke<string>(
                        "find_path_by_where",
                        {
                            name: ui.name
                        }
                    );

                    ui.path.value = foundPath;

                    setResult(
                        ui.result,
                        [
                            `已从 PATH 找到 ${ui.name}`,
                            `路径: ${foundPath}`,
                            "请点击「保存设置」保留该配置。"
                        ].join("\n")
                    );

                    showStatus(
                        `已从 PATH 获取 ${ui.name} 路径，请保存设置`,
                        false,
                        5000
                    );

                } catch (e) {

                    setResult(
                        ui.result,
                        `从 PATH 获取失败: ${String(e)}`,
                        true
                    );

                    showStatus(
                        `从 PATH 获取 ${ui.name} 失败: ${String(e)}`,
                        true,
                        6000
                    );

                } finally {

                    ui.path.disabled = false;
                }
            });
            ui.testBtn.addEventListener("click", async () => {
                ui.testBtn.disabled = true;

                setResult(
                    ui.result,
                    `正在测试 ${ui.name}...`
                );

                try {
                    const testOpt = await invoke<TestResult>(
                        "test",
                        {
                            path: ui.path.value,
                            tag: ui.name,
                        }
                    );
                    
                    setResult(
                        ui.result,
                        [
                            testOpt.ok ? "测试命令通过" : "测试命令失败",
                            testOpt.stdout.trim() ? `stdout:\n${testOpt.stdout.trim()}` : "",
                            testOpt.stderr.trim() ? `stderr:\n${testOpt.stderr.trim()}` : "",
                        ].filter(Boolean).join("\n")
                    );
                } catch (e) {
                    setResult(
                        ui.result,
                        `测试失败: ${String(e)}`,
                        true
                    );
                } finally {

                    ui.testBtn.disabled = false;
                }
            });
            ui.checkBtn.addEventListener("click", async () => {
                ui.checkBtn.disabled = true;

                setResult(
                    ui.result,
                    `正在检查版本 ${ui.name}...`
                );

                try {
                    const checkOpt = await invoke<CheckResult>(
                        "check",
                        {
                            path: ui.path.value,
                            tag: ui.name,
                        }
                    );
                    console.log(checkOpt);
                    setResult(
                        ui.result,
                        [
                            checkOpt.ok ? "命令检验通过" : "命令执行失败",
                            `版本: ${checkOpt.version || "未知"}`,
                            checkOpt.stdout.trim() ? `stdout:\n${checkOpt.stdout.trim()}` : "",
                            checkOpt.stderr.trim() ? `stderr:\n${checkOpt.stderr.trim()}` : "",
                        ].filter(Boolean).join("\n")
                    );
                } catch (e) {
                    setResult(
                        ui.result,
                        `测试失败: ${String(e)}`,
                        true
                    );
                } finally {

                    ui.checkBtn.disabled = false;
                }
            });
        });
    });
    
}

export async function saveToolsSettings() {
    await invoke('save_tools_settings', {
        sadbIp: sadbIpInput.value.trim(),
        sadbPort:  parseInt(sadbPortInput.value) <= 0 ? 5555 : (parseInt(sadbPortInput.value) >= 65535 ? 5555 : parseInt(sadbPortInput.value)),
        adbInstallDir: adb1.value,
        adbPath: adbPath.value,
        aria2cInstallDir: aria2c1.value,
        aria2cPath: aria2cPath.value,
        aria2cThread: parseInt(aria2cThread.value) <= 0 ? 4 : (parseInt(aria2cThread.value) > 16 ? 16 : parseInt(aria2cThread.value)),
    });
}