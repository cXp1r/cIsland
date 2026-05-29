import { invoke } from "@tauri-apps/api/core";
import { aria2cThread } from "./tools";
import { Aria2cRpcEnd, Aria2cRpcProgress} from "./types";
import { listen } from "@tauri-apps/api/event";
import { showStatus } from "./settings-shared";
//实则归属tools,但是作为一个工具模块还是分页出来,也其他初始化方式区别开
const url = document.getElementById("aria2c-url") as HTMLInputElement;
const thread = document.getElementById("aria2c-downloader-thread") as HTMLInputElement;
const saveDir = document.getElementById("aria2c-save-dir") as HTMLInputElement;
const downloadBtn = document.getElementById("aria2c-download-btn") as HTMLButtonElement;
const openDivBtn = document.getElementById("aria2c-open-dir-btn") as HTMLButtonElement;

const progressWrapper = document.getElementById("aria2c-progress-wrapper") as HTMLDivElement;


listen<Aria2cRpcProgress>("aria2c-rpc-progress", (event) => {
    let res = event.payload;
    let progressDiv = document.getElementById(res.uuid) as HTMLDivElement;
    if (progressDiv) {
        const percent = Math.min(
            100,
            Math.max(0, res.progress * 100)
        );
        console.log(percent);
        (progressDiv.querySelector("#bar") as HTMLDivElement).style.width = `${percent}%`;
        (progressDiv.querySelector("#percent") as HTMLSpanElement)
            .innerText = `${percent.toFixed(2)}%`;
    }

});

listen<Aria2cRpcEnd>("aria2c-rpc-end", (event) => {
    let res = event.payload;
    let progressDiv = document.getElementById(res.uuid) as HTMLDivElement;
    if (progressDiv) {
        (progressDiv.querySelector("#state") as HTMLSpanElement)
            .innerText = res.ok ? `下载成功, 路径:${res.path}` : "下载失败";
    }
    showStatus(res.ok ? `下载成功, 文件名:${res.filename}, 路径:${res.path}` : "下载失败", false, 5000)
})

export function initDownloader() {
    thread.value = aria2cThread.value;
    console.log(aria2cThread.value, thread.value);
    invoke<string>('get_user_dir').then((r) => {
        saveDir.value = r + "\\downloads";
    })
    downloadBtn.addEventListener("click", async () => {
        let urlq = url.value.trim()
        if (urlq !== ""){
            const uuid = crypto.randomUUID();
            invoke('aria2c_rpc_download', {url: url.value, dir: saveDir.value, uuid: uuid})
            progressWrapper.innerHTML += `<div id="${uuid}">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
                        <span id="state">下载中...</span>
                        <span id="percent">0%</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
                        <div id="bar" style="width: 0%; height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.2s ease;"></div>
                    </div>
                    </div>`;
        } else {
            showStatus("请填写下载链接", true);
        }
    });
    openDivBtn.addEventListener("click", async () => {
        await invoke('open_dir', { dir: saveDir.value })
    })
}