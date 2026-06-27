import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { pageStateMachine } from "../../../states";
import { sadbBtnScan, sadbBtnStart, sadbBtnStop, sadbCanvas, sadbDeviceWrapper, sadbStatus } from "../../../doms";
import { sadbchannel } from "../../../renders/pages/sadb/render";

const machine = pageStateMachine.sadb;

type AdbDevice = {
  name: string;
  ip: string;
  port: number;
};


function isMirroring(): boolean {
  return machine.state === "mirroring";
}

function setStatus(text: string, isError = false) {
  sadbStatus.textContent = text;
  sadbStatus.style.color = isError ? "#ff6f7f" : "#39d98a";
}

function toDeviceCoords(e: MouseEvent): [number, number] {
  const drawRect = pageStateMachine.substates["sadb"].drawRect;
  const rect = sadbCanvas.getBoundingClientRect();
  const rx = (e.clientX - rect.left - drawRect.x) / drawRect.w;
  const ry = (e.clientY - rect.top - drawRect.y) / drawRect.h;
  return [
    Math.round(Math.max(0, Math.min(sadbCanvas.width - 1, rx * sadbCanvas.width))),
    Math.round(Math.max(0, Math.min(sadbCanvas.height - 1, ry * sadbCanvas.height))),
  ];
}


function sendTouchEvent(action: 0 | 1 | 2, e: MouseEvent) {
  if (!isMirroring()) return;
  const [x, y] = toDeviceCoords(e);
  invoke("sadb_send_touch_event", {
    x,
    y,
    screenWidth: sadbCanvas.width,
    screenHeight: sadbCanvas.height,
    action,
    buttons: machine.mouseButtons,
  }).catch(() => {});
}

function sendScrollEvent(e: WheelEvent) {
  if (!isMirroring()) return;
  const [x, y] = toDeviceCoords(e);
  const hscroll = Math.max(-16, Math.min(16, e.deltaX / 53));
  const vscroll = Math.max(-16, Math.min(16, -e.deltaY / 53));
  invoke("sadb_send_scroll_event", {
    x,
    y,
    screenWidth: sadbCanvas.width,
    screenHeight: sadbCanvas.height,
    hscroll,
    vscroll,
  }).catch(() => {});
}

async function startStream() {
  try {
    await invoke("sadb_stop_mirroring");
  } catch {
    /* ignore */
  }

  sadbBtnStart.disabled = true;
  sadbBtnStop.disabled = false;
  setStatus("Starting mirroring...");

  try {
    console.log(1);
    await invoke("sadb_start_mirroring", {
      sadbchannel,
      bitrate: 4_000_000,
      serial: null,
    });
    return;
  } catch (e) {
    setStatus(`USB mirroring failed: ${e}`, true);
  }
  let selectIp = pageStateMachine.sadb.selectIp;
  if (selectIp) {
    setStatus(`Connecting WiFi device ${selectIp}...`);
    try {
      await invoke("sadb_connect_device", { serial: selectIp });
    } catch (e) {
      setStatus(`WiFi connect failed: ${e}`, true);
      sadbBtnStart.disabled = false;
      sadbBtnStop.disabled = true;
      return;
    }

    try {
      await invoke("sadb_start_mirroring", {
        sadbchannel,
        bitrate: 4_000_000,
        serial: selectIp,
      });
      return;
    } catch (e) {
      setStatus(`WiFi mirroring failed: ${e}`, true);
      sadbBtnStart.disabled = false;
      sadbBtnStop.disabled = true;
    }
  } else {
    setStatus("No available USB device. Scan or connect a device first.", true);
    sadbBtnStart.disabled = false;
    sadbBtnStop.disabled = true;
  }
}

function stopStream() {
  sadbBtnStart.disabled = false;
  sadbBtnStop.disabled = true;
  machine.mouseButtons = 0;
  machine.deviceW = 0;


  // TODO: dispatch the SADB state machine back to idle/collapsed here.
  invoke("sadb_stop_mirroring")
    .catch(() => {})
    .finally(() => {
      if (machine.currentSerial) {
        invoke("sadb_disconnect_device", { serial: machine.currentSerial }).catch(() => {});
        machine.currentSerial = null;
      }
    });
}


const imeInput = document.createElement("textarea");
imeInput.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
document.body.appendChild(imeInput);

function onImeInput() {
  if (!machine.deviceW) return;
  const text = imeInput.value;
  if (text) {
    invoke("sadb_inject_text", { text }).catch(() => {});
    imeInput.value = "";
  }
}

function onImeKeydown(e: KeyboardEvent) {
  if (!machine.deviceW) return;
  const key = e.key;

  if (key === "Backspace") {
    e.preventDefault();
    invoke("sadb_send_keycode", { action: 0, keycode: 67, metastate: 0 }).catch(() => {});
    return;
  }
  if (key === "Enter") {
    e.preventDefault();
    invoke("sadb_send_keycode", { action: 0, keycode: 66, metastate: 0 }).catch(() => {});
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    const AMETA_CTRL_LEFT_ON = 0x00002000;
    const ctrlDown = () =>
      invoke("sadb_send_keycode", { action: 0, keycode: 113, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
    const ctrlUp = () =>
      invoke("sadb_send_keycode", { action: 1, keycode: 113, metastate: 0 }).catch(() => {});

    switch (e.code) {
      case "KeyA":
        e.preventDefault();
        ctrlDown();
        invoke("sadb_send_keycode", { action: 0, keycode: 29, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        invoke("sadb_send_keycode", { action: 1, keycode: 29, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        ctrlUp();
        return;
      case "KeyC":
        e.preventDefault();
        ctrlDown();
        invoke("sadb_send_keycode", { action: 0, keycode: 31, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        invoke("sadb_send_keycode", { action: 1, keycode: 31, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        ctrlUp();
        return;
      case "KeyX":
        e.preventDefault();
        ctrlDown();
        invoke("sadb_send_keycode", { action: 0, keycode: 52, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        invoke("sadb_send_keycode", { action: 1, keycode: 52, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        ctrlUp();
        return;
      case "KeyV":
        e.preventDefault();
        navigator.clipboard.readText()
          .then((text) => {
            // TODO 复制粘贴统一由后端处理
            invoke("sadb_set_clipboard", { text: { text, timestamp: Date.now() }, paste: true }).catch(() => {});
          });
        return;
    }
  }
}

function onImePaste(e: ClipboardEvent) {
  if (!machine.deviceW) return;
  e.preventDefault();
  const text = e.clipboardData?.getData("text/plain") || "";
  if (text) {
    machine.lastSyncedText = text;
    invoke("sadb_set_clipboard", { text, paste: true }).catch(() => {});
  }
}

function onMdnsFound(e: { payload: AdbDevice }) {
  const d = e.payload;
  const item = document.createElement("div");
  item.className = "item";

  const title = document.createElement("span");
  title.className = "item-title";
  title.textContent = `${d.name}  ${d.ip}:${d.port}`;

  const btn = document.createElement("button");
  btn.className = "sadb-btn";
  btn.type = "button";
  btn.textContent = "Connect";
  btn.addEventListener("click", () => {
    machine.selectIp = `${d.ip}:${d.port}`;
    setStatus(`Selected device ${title.textContent}`);
  });

  item.appendChild(title);
  item.appendChild(btn);
  sadbDeviceWrapper.appendChild(item);
}

function onMdnsDone() {
  if (sadbDeviceWrapper.children.length === 0) {
    setStatus("No connectable device.", true);
    sadbDeviceWrapper.style.display = "none";
  } else {
    setStatus("Scan complete.");
  }
}

export function initSadb() {
  sadbCanvas.addEventListener("mousedown", (e) => {
    if (!isMirroring()) return;
    e.preventDefault();
    e.stopPropagation();
    machine.mouseButtons |= (1 << e.button);
    sendTouchEvent(0, e);
  });

  sadbCanvas.addEventListener("mousemove", (e) => {
    if (!isMirroring() || machine.mouseButtons === 0) return;
    sendTouchEvent(2, e);
  });

  sadbCanvas.addEventListener("mouseup", (e) => {
    if (isMirroring()) {
      e.preventDefault();
      sendTouchEvent(1, e);
    }
    machine.mouseButtons &= ~(1 << e.button);
  });

  sadbCanvas.addEventListener("mouseleave", () => {
    if (isMirroring() && machine.mouseButtons !== 0) {
      invoke("sadb_send_touch_event", {
        x: 0,
        y: 0,
        screenWidth: sadbCanvas.width,
        screenHeight: sadbCanvas.height,
        action: 1,
        buttons: machine.mouseButtons,
      }).catch(() => {});
    }
    machine.mouseButtons = 0;
  });

  sadbCanvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  sadbCanvas.addEventListener("wheel", (e) => {
    if (!isMirroring()) return;
    e.preventDefault();
    sendScrollEvent(e);
  }, { passive: false });

  sadbBtnStart.addEventListener("click", startStream);
  sadbBtnStop.addEventListener("click", () => {
    setStatus("Stopping...");
    stopStream();
  });
  sadbBtnScan.addEventListener("click", () => {
    setStatus("Scanning...");
    sadbDeviceWrapper.style.display = "flex";
    sadbDeviceWrapper.replaceChildren();
    void invoke("scan_adb_devices");
  });

  imeInput.addEventListener("input", onImeInput);
  imeInput.addEventListener("keydown", onImeKeydown);
  imeInput.addEventListener("paste", onImePaste);

  listen<AdbDevice>("mdns-found", onMdnsFound);
  listen("mdns-done", onMdnsDone);
}
