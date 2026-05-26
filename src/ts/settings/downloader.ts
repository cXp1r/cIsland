import { invoke } from "@tauri-apps/api/core";
import { aria2cThread, setResult } from "./tools";
import { TestResult } from "./types";
//实则归属tools,但是作为一个工具模块还是分页出来,也其他初始化方式区别开
const url = document.getElementById("aria2c-url") as HTMLInputElement;
const thread = document.getElementById("aria2c-downloader-thread") as HTMLInputElement;
const saveDir = document.getElementById("aria2c-save-dir") as HTMLInputElement;
const downloadBtn = document.getElementById("aria2c-download-btn") as HTMLButtonElement;
const openDivBtn = document.getElementById("aria2c-open-dir-btn") as HTMLButtonElement;
const result = document.getElementById("aria2c-downloader-result") as HTMLInputElement;
export function initDownloader() {
    thread.value = aria2cThread.value;
    console.log(aria2cThread.value, thread.value);
    invoke<string>('get_user_dir').then((r) => {
        saveDir.value = r + "\\downloads";
    })
    downloadBtn.addEventListener("click", async () => {
        
        let opt = await invoke<TestResult>('aria2c_download', {
            url: url.value,
            dir: saveDir.value,
            thread: parseInt(thread.value) <= 0 ? 4 : (parseInt(thread.value) > 16 ? 16 : parseInt(thread.value)),
        })
        
        setResult(
            result,
            [
                opt.ok ? "下载成功" : "下载失败",,
                opt.stdout.trim() ? `stdout:\n${opt.stdout.trim()}` : "",
                opt.stderr.trim() ? `stderr:\n${opt.stderr.trim()}` : "",
            ].filter(Boolean).join("\n"))
    });
    openDivBtn.addEventListener("click", async () => {
        await invoke('open_dir', { dir: saveDir.value })
    })
}