import { invoke } from "@tauri-apps/api/core";
import { ToolsSettingsResponse, TestResult } from "../../settings/types";
import { setIsAria2c } from "../state";

export const url = document.getElementById("downloader-url") as HTMLInputElement;
const thread = document.getElementById("downloader-downloader-thread") as HTMLInputElement;
const saveDir = document.getElementById("downloader-save-dir") as HTMLInputElement;
const downloadBtn = document.getElementById("downloader-download-btn") as HTMLButtonElement;
const openDivBtn = document.getElementById("downloader-open-dir-btn") as HTMLButtonElement;
const result = document.getElementById("downloader-result") as HTMLDivElement;



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
            let opt = await invoke<TestResult>('aria2c_download', {
                url: urlq,
                dir: saveDir.value,
                thread: parseInt(thread.value) <= 0 ? 4 : (parseInt(thread.value) > 16 ? 16 : parseInt(thread.value)),
            })
            result.innerText = opt.ok ? "下载成功" : "下载失败";
        } else {
            result.innerText = "请填写下载链接";
        }
        
    });
    openDivBtn.addEventListener("click", async () => {
        await invoke('open_path', { path: saveDir.value })
    })
}