import { invoke } from "@tauri-apps/api/core";

const AgentList = [
    "claude",
    "codex",
    //目前就这两个支持
]
const buttonList = document.getElementById("agent-list") as HTMLDivElement;
function scan() {
    AgentList.forEach(async (a) => {
        const foundPath = await invoke<string>(
                        "find_path_by_where",
                        {
                            name: a
                        }
                    );
                    console.log(foundPath);
        buttonList.innerHTML += `<div class="setting-item">
              <div class="setting-label">
                <h3>${a}</h3>
                <p>安装地址:${foundPath}</p>
              </div>
              <div class="setting-control">
                <button class="agent-handler-install-btn btn" type="button" name="${a}">安装hooks</button>
              </div>
            </div>`
    })
    
}
export function initAgentHandlerInstaller() {
    scan();
}