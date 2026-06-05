import { invoke } from "@tauri-apps/api/core";
import { initDownloader } from "./downloader";
import { initTools } from "./settings-tools";
import { initAgentHandlerInstaller } from "./agent-handler";

export let exeDir = "";
export let configDir = "";
export let userDir = "";

const initDirs = Promise.all([
    invoke<string>('get_exe_dir').then((d) => {
        exeDir = d + "\\";
    }),
    invoke<string>('get_config_dir').then((d) => {
        configDir = d + "\\";
    }),
    invoke<string>('get_user_dir').then((d) => {
        userDir = d + "\\";
    })
]);


document.addEventListener('DOMContentLoaded', () => {
    initDirs.then(() => {
        initTools();
        initDownloader();
        initAgentHandlerInstaller();
    });
});