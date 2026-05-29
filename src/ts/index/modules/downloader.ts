import { invoke } from "@tauri-apps/api/core";
import { ToolsSettingsResponse, Aria2cRpcProgress, Aria2cRpcEnd } from "../../settings/types";
import { setIsAria2c } from "../state";
import { listen } from "@tauri-apps/api/event";

export const url = document.getElementById("downloader-url") as HTMLInputElement;
const thread = document.getElementById("downloader-downloader-thread") as HTMLInputElement;
const saveDir = document.getElementById("downloader-save-dir") as HTMLInputElement;
const downloadBtn = document.getElementById("downloader-download-btn") as HTMLButtonElement;
const openDivBtn = document.getElementById("downloader-open-dir-btn") as HTMLButtonElement;
const result = document.getElementById("downloader-result") as HTMLDivElement;
const progressWrapper = document.getElementById("aria2c-progress-wrapper") as HTMLDivElement;


function formatSpeed(bytesPerSec: number) {
    const mb = bytesPerSec / 1024 / 1024;

    if (mb < 1) {
        return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
    }

    return `${mb.toFixed(2)} MB/s`;
}

listen<Aria2cRpcProgress>("aria2c-rpc-progress", (event) => {
    let res = event.payload;
    let progressDiv = document.getElementById(res.uuid) as HTMLDivElement;
    if (progressDiv) {
        const percent = Math.min(
            100,
            Math.max(0, res.progress * 100)
        );
        const speed = formatSpeed(res.speed);
        (progressDiv.querySelector("#bar") as HTMLDivElement).style.width = `${percent}%`;
        (progressDiv.querySelector("#percent") as HTMLSpanElement)
            .innerText = `${percent.toFixed(2)}% ${speed}`;
    }

});

function truncate(str: string, max = 30) {
    if (!str) return "";
    if (str.length <= max) return str;

    const head = str.slice(0, Math.floor(max * 0.6));
    const tail = str.slice(-Math.floor(max * 0.4));

    return `${head}...${tail}`;
}

listen<Aria2cRpcEnd>("aria2c-rpc-end", (event) => {
    let res = event.payload;
    let progressDiv = document.getElementById(res.uuid) as HTMLDivElement;
    if (progressDiv) {
        (progressDiv.querySelector("#state") as HTMLSpanElement)
            .innerText = res.ok
                ? `下载成功, 文件名:${truncate(res.filename, 25)}`
                : "下载失败";
    }
    window.setTimeout(() => {
        const el = document.getElementById(res.uuid);
        el?.remove();
    }, 1000);
})

export function initDownloader() {
    
    invoke<ToolsSettingsResponse>('get_tools_settings').then((r) => {
            if (r.aria2c_path.length > 1) {
                setIsAria2c(true);
            }
            thread.value = r.aria2c_thread.toString();
        })
    invoke<string>('get_user_dir').then((r) => {
        saveDir.value = r + "\\downloads";
    })
    downloadBtn.addEventListener("click", async () => {
            let urlq = url.value.trim()
            if (urlq !== ""){
                result.innerText = ""
                const uuid = crypto.randomUUID();
                invoke('aria2c_rpc_download', {url: url.value, dir: saveDir.value, uuid: uuid})
                progressWrapper.innerHTML += `<div id="${uuid}">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
                            <span id="state">下载中...</span>
                            <span id="percent">0%</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: black; border-radius: 3px; overflow: hidden;">
                            <div id="bar" style="width: 0%; height: 100%; background: #0078d4; border-radius: 3px; transition: width 0.2s ease;"></div>
                        </div>
                        </div>`;
            } else {
                result.innerText = "请填写下载链接"
            }
        });
    openDivBtn.addEventListener("click", async () => {
        await invoke('open_path', { path: saveDir.value })
    })
}