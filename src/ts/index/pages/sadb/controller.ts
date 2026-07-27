import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { capsule } from "../../shell/dom";
import { pageStateMachine } from "../machine";
import { createSadbChannel, invalidateSadbSession } from "./canvas-renderer";
import { resizeHandle, sadbBtnScan, sadbBtnStart, sadbBtnStop, sadbCanvas, sadbDeviceWrapper, sadbStatus } from "./dom";
import { resizeCapsule } from "../../utils/rAF";

let sadbchannel = createSadbChannel();
let deviceWrapperTimer: number | null = null;
function machine() {
  return pageStateMachine.sadb;
}

type AdbDevice = {
  name: string;
  ip: string;
  port: number;
};


function isMirroring(): boolean {
  return machine().state === "mirroring";
}

function setStatus(text: string, isError = false) {
  sadbStatus.textContent = text;
  sadbStatus.style.color = isError ? "#ff6f7f" : "#39d98a";
}

function resetSadbFrontendState() {
  machine().mouseButtons = 0;
  machine().deviceW = 0;
  machine().lastSyncedText = null;
  machine().pcClipboard = null;
  machine().phoneClipboard = null;
  machine().currentSerial = null;
  machine().drawRect = { x: 0, y: 0, w: 0, h: 0 };
}

function calcDrawRect() {
  const cw = sadbCanvas.width;
  const ch = sadbCanvas.height;
  const rect = sadbCanvas.getBoundingClientRect();
  if (!cw || !ch || !rect.width || !rect.height) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  const canvasAspect = cw / ch;
  const rectAspect = rect.width / rect.height;
  if (canvasAspect > rectAspect) {
    const w = rect.width;
    const h = rect.width / canvasAspect;
    return { x: 0, y: (rect.height - h) / 2, w, h };
  }

  const h = rect.height;
  const w = rect.height * canvasAspect;
  return { x: (rect.width - w) / 2, y: 0, w, h };
}

function toDeviceCoords(e: MouseEvent): [number, number] {
  const rect = sadbCanvas.getBoundingClientRect();
  const drawRect = calcDrawRect();
  machine().drawRect = drawRect;
  if (!drawRect.w || !drawRect.h) return [0, 0];
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
    buttons: machine().mouseButtons,
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
  invalidateSadbSession();
  resetSadbFrontendState();
  sadbchannel = createSadbChannel();

  sadbBtnStart.disabled = true;
  sadbBtnStop.disabled = false;
  setStatus("Starting mirroring...");

  try {
    console.log(1);
    await invoke("sadb_start_mirroring", {
      channel: sadbchannel,
      bitrate: 4_000_000,
      serial: null,
    });
    imeInput.focus({ preventScroll: true });
    return;
  } catch (e) {
    setStatus(`USB mirroring failed: ${e}`, true);
  }
  let selectIp = pageStateMachine.sadb.selectIp;
  if (selectIp) {
    setStatus(`Connecting WiFi device ${selectIp}...`);
    try {
      await invoke("sadb_connect_device", { serial: selectIp });
      machine().currentSerial = selectIp;
    } catch (e) {
      setStatus(`WiFi connect failed: ${e}`, true);
      sadbBtnStart.disabled = false;
      sadbBtnStop.disabled = true;
      return;
    }

    try {
      await invoke("sadb_start_mirroring", {
        channel: sadbchannel,
        bitrate: 4_000_000,
        serial: selectIp,
      });
      imeInput.focus({ preventScroll: true });
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

async function stopStream() {
  sadbBtnStart.disabled = false;
  sadbBtnStop.disabled = true;
  const serial = machine().currentSerial;
  invalidateSadbSession();
  resetSadbFrontendState();
  pageStateMachine.substates["sadb"].dispatch({
    tag: "core",
    event: "stop",
  });

  try {
    await invoke("sadb_stop_mirroring");
  } catch {
    /* ignore */
  }

  if (serial) {
    invoke("sadb_disconnect_device", { serial }).catch(() => {});
  }
}


const imeInput = document.createElement("textarea");
imeInput.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
document.body.appendChild(imeInput);

function onImeInput() {
  if (!machine().deviceW) return;
  const text = imeInput.value;
  if (text) {
    invoke("sadb_inject_text", { text }).catch(() => {});
    imeInput.value = "";
  }
}

async function sendCtrlShortcut(keycode: number) {
  const AMETA_CTRL_LEFT_ON = 0x00002000;
  await invoke("sadb_send_keycode", { action: 0, keycode: 113, metastate: AMETA_CTRL_LEFT_ON });
  await invoke("sadb_send_keycode", { action: 0, keycode, metastate: AMETA_CTRL_LEFT_ON });
  await invoke("sadb_send_keycode", { action: 1, keycode, metastate: AMETA_CTRL_LEFT_ON });
  await invoke("sadb_send_keycode", { action: 1, keycode: 113, metastate: 0 });
}

function onImeKeydown(e: KeyboardEvent) {
  if (!machine().deviceW) return;
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
    switch (e.code) {
      case "KeyA":
        e.preventDefault();
        void sendCtrlShortcut(29).catch(() => {});
        return;
      case "KeyC":
        e.preventDefault();
        void sendCtrlShortcut(31).catch(() => {});
        return;
      case "KeyX":
        e.preventDefault();
        void sendCtrlShortcut(52).catch(() => {});
        return;
      case "KeyV":
        e.preventDefault();
        invoke("sadb_paste_pc_clipboard").catch(() => {});
        return;
    }
  }
}

function onImePaste(e: ClipboardEvent) {
  if (!machine().deviceW) return;
  e.preventDefault();
  invoke("sadb_paste_pc_clipboard").catch(() => {});
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
  btn.textContent = "连接";
  btn.addEventListener("click", () => {
    machine().selectIp = `${d.ip}:${d.port}`;
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
  if (deviceWrapperTimer) clearTimeout(deviceWrapperTimer);
  deviceWrapperTimer = window.setTimeout(() => {
    sadbDeviceWrapper.style.display = "none";
  }, 1000)
}

export function initSadbComponents() {
  let resizing = false;
  let resizePointerId = -1;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartW = 0;
  let resizeStartH = 0;
  let pendingResizeW = 0;
  let pendingResizeH = 0;
  let resizeFrame = 0;

  function finishResize(releasePointer = true) {
    if (!resizing) return;
    resizing = false;

    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }

    if (releasePointer && resizePointerId >= 0 && resizeHandle.hasPointerCapture(resizePointerId)) {
      resizeHandle.releasePointerCapture(resizePointerId);
    }

    resizePointerId = -1;
    document.body.style.userSelect = "";
    resizeCapsule(pendingResizeW, pendingResizeH);
    machine().drawRect = calcDrawRect();
  }

  resizeHandle.addEventListener("pointerdown", (e: PointerEvent) => {
    if (!isMirroring()) return;
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    resizePointerId = e.pointerId;
    resizeHandle.setPointerCapture(e.pointerId);
    const rect = capsule.getBoundingClientRect();
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartW = rect.width;
    resizeStartH = rect.height;
    pendingResizeW = rect.width;
    pendingResizeH = rect.height;
    document.body.style.userSelect = "none";
  });

  resizeHandle.addEventListener("pointermove", (e: PointerEvent) => {
    if (!resizing || e.pointerId !== resizePointerId) return;
    e.preventDefault();
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;
    const denom = (resizeStartW * resizeStartW) + (resizeStartH * resizeStartH);
    if (!denom) return;

    const scale = Math.max(
      0.25,
      ((resizeStartW + dx) * resizeStartW + (resizeStartH + dy) * resizeStartH) / denom,
    );
    pendingResizeW = Math.max(1, Math.round(resizeStartW * scale));
    pendingResizeH = Math.max(1, Math.round(resizeStartH * scale));

    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (resizing) {
        resizeCapsule(pendingResizeW, pendingResizeH);
      }
    });
  });

  resizeHandle.addEventListener("pointerup", (e: PointerEvent) => {
    if (!resizing || e.pointerId !== resizePointerId) return;
    e.preventDefault();
    finishResize();
  });

  resizeHandle.addEventListener("pointercancel", (e: PointerEvent) => {
    if (!resizing || e.pointerId !== resizePointerId) return;
    e.preventDefault();
    finishResize();
  });

  resizeHandle.addEventListener("lostpointercapture", () => {
    finishResize(false);
  });

  sadbCanvas.addEventListener("mousedown", (e) => {
    if (!isMirroring()) return;
    e.preventDefault();
    e.stopPropagation();
    imeInput.focus({ preventScroll: true });
    machine().mouseButtons |= (1 << e.button);
    sendTouchEvent(0, e);
  });

  sadbCanvas.addEventListener("mousemove", (e) => {
    if (!isMirroring() || machine().mouseButtons === 0) return;
    sendTouchEvent(2, e);
  });

  sadbCanvas.addEventListener("mouseup", (e) => {
    if (isMirroring()) {
      e.preventDefault();
      sendTouchEvent(1, e);
    }
    machine().mouseButtons &= ~(1 << e.button);
  });

  sadbCanvas.addEventListener("mouseleave", () => {
    if (isMirroring() && machine().mouseButtons !== 0) {
      invoke("sadb_send_touch_event", {
        x: 0,
        y: 0,
        screenWidth: sadbCanvas.width,
        screenHeight: sadbCanvas.height,
        action: 1,
        buttons: machine().mouseButtons,
      }).catch(() => {});
    }
    machine().mouseButtons = 0;
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
    void stopStream();
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

  machine().drawRect = calcDrawRect();
}
