import { invoke } from "@tauri-apps/api/core";
import { TestResult } from "./types";

const AgentList = [
    "claude",
    "codex",
    //目前就这两个支持
]
const buttonList = document.getElementById("agent-list") as HTMLDivElement;

async function scan() {
    buttonList.innerHTML = "检测待安装Hooks的agent"; 

    for (const a of AgentList) {
        const foundPath = await invoke<string>("find_path_by_where", {
            name: a
        });


        const item = document.createElement("div");
        item.className = "setting-item";


        const label = document.createElement("div");
        label.className = "setting-label";

        const title = document.createElement("h3");
        title.textContent = a;

        const desc = document.createElement("p");
        desc.textContent = `安装地址: ${foundPath}`;

        label.appendChild(title);
        label.appendChild(desc);


        const control = document.createElement("div");
        control.className = "setting-control";

        const btn = document.createElement("button");
        btn.className = "agent-handler-install-btn btn";
        btn.type = "button";
        btn.dataset.name = a;
        btn.textContent = "安装hooks";


        btn.addEventListener("click", () => {
            console.log(btn.dataset.name);
            invoke("custom_caller");
        });

        control.appendChild(btn);

        // 合并
        item.appendChild(label);
        item.appendChild(control);

        buttonList.appendChild(item);
    }
}
export function initAgentHandlerInstaller() {
    scan();
}