import { invoke } from "@tauri-apps/api/core";
import { showStatus } from "./settings-shared";
import { InstallResult } from "./types";

const aria2c1 = document.getElementById("aria2c-install-dir") as HTMLInputElement
export const aria2cPath = document.getElementById("aria2c-path") as HTMLInputElement
export const aria2cThread = document.getElementById("aria2c-thread") as HTMLInputElement
const aria2cGetPathBtn = document.getElementById("aria2c-get-path-btn") as HTMLButtonElement
const aria2cInitBtn = document.getElementById("aria2c-init-btn") as HTMLButtonElement
const aria2cCheckBtn = document.getElementById("aria2c-check-btn") as HTMLButtonElement
const aria2cTestBtn = document.getElementById("aria2c-test-btn") as HTMLButtonElement
const aria2cResult = document.getElementById("aria2c-check-result") as HTMLInputElement

let WORKSPACE: string | null = null;


const modules = {
    aria2c: {
        installDir: aria2c1,
        initBtn: aria2cInitBtn,
        getPathBtn: aria2cGetPathBtn,
        path: aria2cPath,
        result: aria2cResult,
        name: "aria2c",
    },
};

function setResult(e: HTMLInputElement, t: string, i = false) {
    e.textContent = t;
    e.style.color = i ? "#ff6f7f" : "var(--text)";
}
function sanitize(v: string) {
    return v.replace(/[^a-zA-Z0-9_]/g, "");
}


export function initTools(): void {
    //小巧思
    invoke<string>('get_workspace').then((res) => {
        WORKSPACE = res;
        
        Object.entries(modules).forEach(([name, ui]) => {
            ui.installDir.value = WORKSPACE + "\\" + ui.name;
            ui.installDir.addEventListener("input", () => {
                ui.installDir.value = sanitize(ui.installDir.value);
            });
            ui.initBtn.addEventListener("click", async () => {
                const installDir = ui.installDir.value.trim();
                
                if (!installDir) {
                    setResult(ui.result, "请先填写 ADB 工具安装目录。", true);
                    showStatus("请先填写 ADB 工具安装目录", true);
                    return;
                }
                
                ui.initBtn.disabled = true;

                try {
                    const result = await invoke<InstallResult>('tools_download_and_install_from_github', {
                        idir: installDir,
                        name: 'aria2',
                    });
                    setResult(
                        ui.result,[
                        "初始化完成",
                        `安装目录: ${result.install_dir}`,
                        `${ui.name} 路径: ${result.path}`,
                        "请点击「保存设置」保留该配置。",
                    ].join("\n"));
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
        });
    });
}