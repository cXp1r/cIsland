import { invoke } from "@tauri-apps/api/core";
import { Channel } from "@tauri-apps/api/core";
import { capsule } from "../dom";
import { loge, logd, logi, logw } from "../logger";
import { animateCapsule } from "./rAF";
import { listen } from "@tauri-apps/api/event";
import { $ } from "../../shared";
import { ManualPageState } from "../state-machines/page";
import { pageStateMachine } from "../state-machines/page-machine";

const sadbArea = $<HTMLDivElement>("sadb-area");
const sadbCanvas = $<HTMLCanvasElement>("sadb-canvas");
const sadbBtnStart = $<HTMLButtonElement>("sadb-btn-start");
const sadbBtnStop = $<HTMLButtonElement>("sadb-btn-stop");
const sadbBtnScan = $<HTMLButtonElement>("sadb-btn-scan");
const sadbStatus = $<HTMLSpanElement>("sadb-status");
const sadbDeviceName = $<HTMLSpanElement>("sadb-device-name");
const sadbResolution = $<HTMLSpanElement>("sadb-resolution");
const sadbFps = $<HTMLSpanElement>("sadb-fps");
const sadbDeviceWrapper = $<HTMLDivElement>("sadb-devices-wrapper");

const TAG: string = "SADB";

let selectIp: string | null = null;

type PacketEvent =
  | { type: "meta"; device_name: string; codec: string; width: number; height: number }
  | { type: "packet"; pts: number; key_frame: boolean; config: boolean; data: string }
  | { type: "audio_packet"; pts: number; config: boolean; data: string }
  | { type: "error"; message: string }
  | { type: "closed" }
  | { type: "clipboard"; text: string };

type SadbAudioData = {
  timestamp: number;
  numberOfChannels: number;
  numberOfFrames: number;
  sampleRate: number;
  copyTo(destination: Float32Array, options: { planeIndex: number; format: "f32-planar" }): void;
  close(): void;
};

type AudioDecoder = {
  state: string;
  configure(config: unknown): void;
  decode(chunk: unknown): void;
  close(): void;
};

type AdbDevice = {
    name: string,
    ip: string,
    port: number,
}

declare const AudioDecoder: {
  new(init: { output: (audioData: SadbAudioData) => void; error: (error: Error) => void }): AudioDecoder;
};

declare const EncodedAudioChunk: {
  new(init: { type: "key" | "delta"; timestamp: number; data: ArrayBufferView | ArrayBuffer }): unknown;
};

// 闁冲厜鍋撻柍鍏夊亾 H.264 helpers 闁冲厜鍋撻柍鍏夊亾

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function splitAnnexB(data: Uint8Array): Uint8Array[] {
  const nalus: Uint8Array[] = [];
  let naluStart = -1;
  let i = 0;
  while (i < data.length) {
    const is4 = i + 3 < data.length &&
      data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1;
    const is3 = !is4 && i + 2 < data.length &&
      data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1;
    if (is4 || is3) {
      if (naluStart >= 0 && i > naluStart) {
        nalus.push(data.slice(naluStart, i));
      }
      naluStart = i + (is4 ? 4 : 3);
      i = naluStart;
    } else {
      i++;
    }
  }
  if (naluStart >= 0 && naluStart < data.length) {
    nalus.push(data.slice(naluStart));
  }
  return nalus;
}

function annexBToAVCC(data: Uint8Array): Uint8Array {
  const nalus = splitAnnexB(data);
  let total = 0;
  for (const n of nalus) total += 4 + n.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const n of nalus) {
    const len = n.length;
    out[pos++] = (len >>> 24) & 0xff;
    out[pos++] = (len >>> 16) & 0xff;
    out[pos++] = (len >>> 8) & 0xff;
    out[pos++] = len & 0xff;
    out.set(n, pos);
    pos += len;
  }
  return out;
}

function buildAVCDecoderConfig(sps: Uint8Array, pps: Uint8Array): ArrayBuffer {
  const buf = new Uint8Array(11 + sps.length + pps.length);
  let i = 0;
  buf[i++] = 1;
  buf[i++] = sps[1];
  buf[i++] = sps[2];
  buf[i++] = sps[3];
  buf[i++] = 0xff;
  buf[i++] = 0xe1;
  buf[i++] = (sps.length >> 8) & 0xff;
  buf[i++] = sps.length & 0xff;
  buf.set(sps, i); i += sps.length;
  buf[i++] = 1;
  buf[i++] = (pps.length >> 8) & 0xff;
  buf[i++] = pps.length & 0xff;
  buf.set(pps, i);
  return buf.buffer;
}

// 闁冲厜鍋撻柍鍏夊亾 State 闁冲厜鍋撻柍鍏夊亾

const ctx = sadbCanvas.getContext("2d")!;

let decoder: VideoDecoder | null = null;
let pendingW = 0;
let pendingH = 0;
let frameCounter = 0;
let lastFpsTick = performance.now();
let deviceW = 0;
let deviceH = 0;
let streaming = false;
let mouseButtons = 0;
let clipboardPollInterval: ReturnType<typeof setInterval> | null = null;
let currentSerial: string | null = null;
const SADB_INIT_CAP_W = 280; // 婵炵繝绀侀幆搴ㄥ礉閵婏附顦ч柣銊ュ閻斺偓闁告垵妫楅鏃€鎯?
const SADB_MIN_SCALE = 0.6;  // 闁哄牃鍋撻悘蹇撶箳缂傚寮ㄩ幘鍛缂?168px 閻庤鏋荤槐?
const SADB_MAX_SCALE = 3.0;  // 闁哄牃鍋撳鍫嗗懐绱氶柡鈧幘鍛缂?840px 閻庤鏋荤槐?

// 闁圭顦版晶婊堝嫉?AR 閻犱緤绱曢悾濠氬礄閾忚鐣遍柛鈺佹惈閸ｎ垳浜搁崫鍕靛殶闁挎稑顔抋dbScale 濞戞梹眉缁楀倿宕㈢拠鍙夌殤闁哄嫷鍨伴悿鍕⒔閸涱厽妲€閻?
let initCapW = SADB_INIT_CAP_W;
let initCapH = SADB_INIT_CAP_W;
let sadbScale = 1.0;

// Audio decoder state
let audioCtx: AudioContext | null = null;
let audioDecoder: AudioDecoder | null = null;
let audioBaseTime = 0;
let audioBasePts = 0;

// Clipboard sync state (timestamp tracking avoids echo loops)
let pcClipboard: { text: string; timestamp: number } | null = null;
let phoneClipboard: { text: string; timestamp: number } | null = null;
let lastSyncedText: string | null = null;

// object-fit: contain draw rect for mouse coordinate mapping
let drawRect = { x: 0, y: 0, w: 0, h: 0 };

function cssPx(value: string) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function getSadbChromeSize() {
  const areaStyle = getComputedStyle(sadbArea);
  const statusBar = $<HTMLDivElement>("sadb-status-bar");
  const controls = $<HTMLDivElement>("sadb-controls");
  const gap = cssPx(areaStyle.rowGap || areaStyle.gap);
  const paddingX = cssPx(areaStyle.paddingLeft) + cssPx(areaStyle.paddingRight);
  const paddingY = cssPx(areaStyle.paddingTop) + cssPx(areaStyle.paddingBottom);
  const statusH = statusBar?.offsetHeight || 16;
  const controlsH = controls?.offsetHeight || 24;
  return {
    x: paddingX,
    y: paddingY + statusH + controlsH + gap * 2,
  };
}

function getScaledSize() {
  const scale = Math.max(SADB_MIN_SCALE, Math.min(SADB_MAX_SCALE, sadbScale));
  return {
    capW: Math.round(initCapW * scale),
    capH: Math.round(initCapH * scale),
  };
}

function updateDrawRect() {
  const cw = sadbCanvas.width;
  const ch = sadbCanvas.height;
  if (!cw || !ch) return;
  const rect = sadbCanvas.getBoundingClientRect();
  const canvasAspect = cw / ch;
  const rectAspect = rect.width / rect.height;
  if (canvasAspect > rectAspect) {
    drawRect.w = rect.width;
    drawRect.h = rect.width / canvasAspect;
    drawRect.x = 0;
    drawRect.y = (rect.height - drawRect.h) / 2;
  } else {
    drawRect.h = rect.height;
    drawRect.w = rect.height * canvasAspect;
    drawRect.x = (rect.width - drawRect.w) / 2;
    drawRect.y = 0;
  }
}

async function autoFitWindow() {
  
  if (!deviceW || !deviceH) return;
  const phoneAR = deviceW / deviceH;
  const chrome = getSadbChromeSize();
  initCapW = SADB_INIT_CAP_W;
  initCapH = Math.round((initCapW - chrome.x) / phoneAR + chrome.y);
  sadbScale = 1.0;
  const { capW, capH } = getScaledSize();
  animateCapsule(capW, capH);
  requestAnimationFrame(updateDrawRect);
  const bodyPad = parseFloat(getComputedStyle(document.body).paddingTop) || 5;
  logd(TAG, "reach sync_window_size")
  invoke("sync_window_size", { width: capW, height: capH + bodyPad + 5, reposition: true }).catch(() => {});
}

function setStatus(s: string, isError = false) {
  sadbStatus.textContent = s;
  sadbStatus.style.color = isError ? "#ff6f7f" : "#39d98a";
}

function tickFps() {
  const now = performance.now();
  const dt = now - lastFpsTick;
  if (dt >= 1000) {
    const fps = Math.round((frameCounter * 1000) / dt);
    sadbFps.textContent = `${fps} fps`;
    frameCounter = 0;
    lastFpsTick = now;
  }
}

// 闁冲厜鍋撻柍鍏夊亾 Video 闁冲厜鍋撻柍鍏夊亾

function renderFrame(frame: VideoFrame) {
  if (sadbCanvas.width !== frame.displayWidth || sadbCanvas.height !== frame.displayHeight) {
    sadbCanvas.width = frame.displayWidth;
    sadbCanvas.height = frame.displayHeight;
  }
  ctx.drawImage(frame, 0, 0, sadbCanvas.width, sadbCanvas.height);
  frame.close();
  frameCounter++;
  tickFps();
}

function initDecoder(codec: string, width: number, height: number) {
  if (decoder) { try { decoder.close(); } catch { /* ignore */ } }
  pendingW = width;
  pendingH = height;
  decoder = new VideoDecoder({
    output: renderFrame,
    error: (e) => {
      loge(TAG, "VideoDecoder error:", e);
      setStatus(`閻熸瑱绲块悥婊堝闯閵娾晜鏅╅悹? ${e.message}`);
    },
  });
  sadbCanvas.width = width;
  sadbCanvas.height = height;
  sadbResolution.textContent = `${width}x${height} (${codec})`;
}

function applyConfigPacket(data: Uint8Array) {
  if (!decoder) return;
  const nalus = splitAnnexB(data);
  const sps = nalus.find(n => n.length > 0 && (n[0] & 0x1f) === 7);
  const pps = nalus.find(n => n.length > 0 && (n[0] & 0x1f) === 8);
  if (!sps || !pps) return;
  const profile = sps[1].toString(16).padStart(2, "0");
  const compat = sps[2].toString(16).padStart(2, "0");
  const level = sps[3].toString(16).padStart(2, "0");
  const codecStr = `avc1.${profile}${compat}${level}`;
  const description = buildAVCDecoderConfig(sps, pps);
  decoder.configure({
    codec: codecStr,
    codedWidth: pendingW,
    codedHeight: pendingH,
    description,
    optimizeForLatency: true,
  });
}

// 闁冲厜鍋撻柍鍏夊亾 Audio (Opus via WebCodecs AudioDecoder) 闁冲厜鍋撻柍鍏夊亾

function initAudioDecoder(configData: Uint8Array) {
  if (typeof AudioDecoder === "undefined") {
    logw(TAG, "AudioDecoder not available in this browser");
    return;
  }
  if (configData.length < 19) {
    logw(TAG, "Opus config packet too short:", configData.length);
    return;
  }
  const channelCount = configData[9];
  const sampleRate = new DataView(
    configData.buffer, configData.byteOffset + 12, 4
  ).getUint32(0, true);

  audioCtx = new AudioContext({ sampleRate });
  audioBaseTime = 0;
  audioBasePts = 0;

  audioDecoder = new AudioDecoder({
    output: (audioData) => {
      if (!audioCtx) return;
      if (audioBaseTime === 0) {
        audioBasePts = audioData.timestamp;
        audioBaseTime = audioCtx.currentTime + 0.05;
      }
      const buf = audioCtx.createBuffer(
        audioData.numberOfChannels,
        audioData.numberOfFrames,
        audioData.sampleRate,
      );
      for (let ch = 0; ch < audioData.numberOfChannels; ch++) {
        audioData.copyTo(buf.getChannelData(ch), { planeIndex: ch, format: "f32-planar" });
      }
      audioData.close();

      const source = audioCtx.createBufferSource();
      source.buffer = buf;
      source.connect(audioCtx.destination);
      const t = audioBaseTime + (audioData.timestamp - audioBasePts) / 1_000_000;
      source.start(Math.max(t, audioCtx.currentTime));
    },
    error: (e) => loge(TAG, "AudioDecoder error:", e),
  });

  audioDecoder.configure({
    codec: "opus",
    sampleRate,
    numberOfChannels: channelCount,
    description: configData,
  });
  logi(TAG, `AudioDecoder configured: opus ${sampleRate}Hz ${channelCount}ch`);
}

function decodeAudio(pts: number, data: Uint8Array) {
  if (!audioDecoder || audioDecoder.state !== "configured") return;
  const chunk = new EncodedAudioChunk({
    type: "key",
    timestamp: pts,
    data,
  });
  audioDecoder.decode(chunk);
}

// 闁冲厜鍋撻柍鍏夊亾 Event handler 闁冲厜鍋撻柍鍏夊亾

function handleEvent(evt: PacketEvent) {
  switch (evt.type) {
    case "meta":
      sadbDeviceName.textContent = evt.device_name;
      deviceW = evt.width;
      deviceH = evt.height;
      initDecoder(evt.codec, evt.width, evt.height);
      setStatus("Mirroring...");
      // 鐎垫澘鎳忓┃鈧梻鍫涘灪濠?闁?闂傗偓濠婂啫鍓奸悘鐐存礀缁辨垿鏁嶉崷鏄怱 + 闁告艾娴烽?flag闁挎稒绋戦弰鍌溾偓闈涙憸閺?autoFitWindow 閻犱礁澧介悿鍡涙晬?
      pageStateMachine.substates[ManualPageState.Sadb].mirroring();
      invoke("set_expanded", { expanded: true }).catch(() => {});
      updateDrawRect();
      autoFitWindow();
      break;
    case "packet": {
      if (!decoder) return;
      const raw = base64ToBytes(evt.data);
      if (evt.config) {
        applyConfigPacket(raw);
        return;
      }
      if (decoder.state !== "configured") return;
      const avcc = annexBToAVCC(raw);
      const chunk = new EncodedVideoChunk({
        type: evt.key_frame ? "key" : "delta",
        timestamp: evt.pts,
        data: avcc,
      });
      try { decoder.decode(chunk); } catch (e) { loge(TAG, "decode error:", e); }
      break;
    }
    case "audio_packet": {
      const raw = base64ToBytes(evt.data);
      if (evt.config) {
        initAudioDecoder(raw);
        return;
      }
      decodeAudio(evt.pts, raw);
      break;
    }
    case "error":
      setStatus(`闂佹寧鐟ㄩ? ${evt.message}`);
      stopStream();
      break;
    case "closed":
      setStatus("Closed");
      stopStream();
      break;
    case "clipboard":
      phoneClipboard = { text: evt.text, timestamp: Date.now() };
      if (evt.text && evt.text !== lastSyncedText) {
        navigator.clipboard.writeText(evt.text)
          .then(() => { lastSyncedText = evt.text; })
          .catch(() => {});
      }
      break;
  }
}

async function startStream() {
  // 闁哄鍋撻柟鍝勵槸閹绮╅姘殥闁?session闁挎稑鐗嗛幃妤冪博椤栨瑧绠介悹鍥︾閸忛亶宕欓埀顒勬偐閼哥鍋撴笟濠勭
  try { await invoke("sadb_stop_mirroring"); } catch { /* ignore */ }

  sadbBtnStart.disabled = true;
  sadbBtnStop.disabled = false;
  setStatus("Starting mirroring...");


  // Step 1: Try USB (no serial)
  try {
    const channel = new Channel<PacketEvent>();
    channel.onmessage = handleEvent;
    await invoke("sadb_start_mirroring", {
      channel,
      bitrate: 4_000_000,
      serial: null,
    });
    clipboardPollInterval = setInterval(pollPCClipboard, 1000);
    currentSerial = null;
    streaming = true;
    return;
  } catch (e) {
    loge(TAG, "USB mirroring failed:", e);
    setStatus(`USB mirroring failed: ${e}`);
  }

  // Step 2: Try WiFi with saved IP
  if (selectIp) {
    console.log(selectIp)
    setStatus(`Connecting WiFi device ${selectIp}...`);
    try {
      await invoke("sadb_connect_device", { serial: selectIp });
    } catch (e) {
      loge(TAG, "WiFi connect failed:", e);
      setStatus(`WiFi connect failed: ${e}`);
      sadbBtnStart.disabled = false;
      sadbBtnStop.disabled = true;
      return;
    }
    try {
      const channel = new Channel<PacketEvent>();
      channel.onmessage = handleEvent;
      await invoke("sadb_start_mirroring", {
        channel,
        bitrate: 4_000_000,
        serial: selectIp,
      });
      clipboardPollInterval = setInterval(pollPCClipboard, 1000);
      currentSerial = selectIp;
      streaming = true;
      return;
    } catch (e) {
      loge(TAG, "WiFi mirroring failed:", e);
      setStatus(`WiFi mirroring failed: ${e}`);
      sadbBtnStart.disabled = false;
      sadbBtnStop.disabled = true;
    }
  } else {
    setStatus("No available USB device. Scan or connect a device first.");
    sadbBtnStart.disabled = false;
    sadbBtnStop.disabled = true;
  }
}

function stopStream() {
  sadbBtnStart.disabled = false;
  sadbBtnStop.disabled = true;
  deviceW = 0;
  deviceH = 0;
  mouseButtons = 0;
  streaming = false;
  if (decoder) { try { decoder.close(); } catch { /* ignore */ } decoder = null; }
  if (audioDecoder) { try { audioDecoder.close(); } catch { /* ignore */ } audioDecoder = null; }
  if (audioCtx) { try { audioCtx.close(); } catch { /* ignore */ } audioCtx = null; }
  audioBaseTime = 0;
  audioBasePts = 0;
  if (clipboardPollInterval) { clearInterval(clipboardPollInterval); clipboardPollInterval = null; }
  pcClipboard = null;
  phoneClipboard = null;
  lastSyncedText = null;
  sadbScale = 1.0;
  // 闁告瑯浜濆﹢浣姐亹閹惧啿顤呭ù鐘茬Т濠€?sadb 閻熸瑥妫楀ù姗€寮懜闈涱枀闁衡偓?capsule 闁哄秴鍢茬槐锟犲椽瀹€鍐冩洟宕?idle 闁告柣鍔庨弫?
  // 闁兼眹鍎抽弫銈夊箣瀹勬澘鍤掗柛鎺戞处瀹曟煡宕氶弶鍨緭濞寸姵鐗為～瀣炊閹惧懐绀夊ù鐘叉噹娴犳盯宕ユ惔锝庝紓婵炴挸鎳愰幃濠囨晬鐏炶偐鐟濇慨鍏夊墲閻撳宕楅張鐢甸搨閻熸瑥妫楀ù姗€鎯冮崟顐ｆ閻?
  const inSadbView = capsule.classList.contains("sadb-expanded") || capsule.classList.contains("sadb-idle");
  if (inSadbView) {
    pageStateMachine.substates[ManualPageState.Sadb].idlePanel();
    invoke("set_expanded", { expanded: false }).catch(() => {});
  }
  invoke("sadb_stop_mirroring").catch((e) => loge(TAG, "sadb_stop_mirroring failed:", e)).finally(() => {
    if (currentSerial) {
      invoke("sadb_disconnect_device", { serial: currentSerial }).catch(() => {});
      currentSerial = null;
    }
  });
}

async function pollPCClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text !== lastSyncedText) {
      lastSyncedText = text;
      await invoke("sadb_set_clipboard", { text, paste: false });
    }
  } catch { /* ignore */ }
}

// 闁冲厜鍋撻柍鍏夊亾 Mouse input forwarding 闁冲厜鍋撻柍鍏夊亾

function toDeviceCoords(e: MouseEvent): [number, number] {
  const rect = sadbCanvas.getBoundingClientRect();
  const rx = (e.clientX - rect.left - drawRect.x) / drawRect.w;
  const ry = (e.clientY - rect.top - drawRect.y) / drawRect.h;
  return [
    Math.round(Math.max(0, Math.min(sadbCanvas.width - 1, rx * sadbCanvas.width))),
    Math.round(Math.max(0, Math.min(sadbCanvas.height - 1, ry * sadbCanvas.height))),
  ];
}

sadbCanvas.addEventListener("mousedown", (e) => {
  if (!deviceW) return;
  e.preventDefault();
  e.stopPropagation();
  mouseButtons |= (1 << e.button);
  const [x, y] = toDeviceCoords(e);
  invoke("sadb_send_touch_event", { x, y, screenWidth: deviceW, screenHeight: deviceH, action: 0, buttons: mouseButtons }).catch(() => {});
});

sadbCanvas.addEventListener("mousemove", (e) => {
  if (!deviceW || mouseButtons === 0) return;
  const [x, y] = toDeviceCoords(e);
  invoke("sadb_send_touch_event", { x, y, screenWidth: deviceW, screenHeight: deviceH, action: 2, buttons: mouseButtons }).catch(() => {});
});

sadbCanvas.addEventListener("mouseup", (e) => {
  if (!deviceW) return;
  e.preventDefault();
  const [x, y] = toDeviceCoords(e);
  invoke("sadb_send_touch_event", { x, y, screenWidth: deviceW, screenHeight: deviceH, action: 1, buttons: mouseButtons }).catch(() => {});
  mouseButtons &= ~(1 << e.button);
});

sadbCanvas.addEventListener("mouseleave", () => {
  if (mouseButtons !== 0 && deviceW) {
    invoke("sadb_send_touch_event", { x: 0, y: 0, screenWidth: deviceW, screenHeight: deviceH, action: 1, buttons: mouseButtons }).catch(() => {});
    mouseButtons = 0;
  }
});

sadbCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

sadbCanvas.addEventListener("wheel", (e) => {
  if (!deviceW) return;
  e.preventDefault();
  const [x, y] = toDeviceCoords(e);
  const vscroll = -e.deltaY / 53;
  const hscroll = e.deltaX / 53;
  invoke("sadb_send_scroll_event", { x, y, screenWidth: deviceW, screenHeight: deviceH, hscroll: Math.max(-16, Math.min(16, hscroll)), vscroll: Math.max(-16, Math.min(16, vscroll)) }).catch(() => {});
}, { passive: false });

sadbCanvas.addEventListener("mousedown", () => {
  if (deviceW) imeInput.focus();
});

// 闁冲厜鍋撻柍鍏夊亾 Keyboard / text input forwarding 闁冲厜鍋撻柍鍏夊亾

const imeInput = document.createElement("textarea");
imeInput.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
document.body.appendChild(imeInput);

imeInput.addEventListener("input", (e: Event) => {
  if (!deviceW) return;
  const ie = e as InputEvent;
  if (ie.isComposing) return;
  const text = imeInput.value;
  if (text) {
    invoke("sadb_inject_text", { text }).catch(() => {});
    imeInput.value = "";
  }
});

imeInput.addEventListener("keydown", (e: KeyboardEvent) => {
  if (!deviceW) return;
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
      case "KeyA": { // Select All
        e.preventDefault();
        ctrlDown();
        invoke("sadb_send_keycode", { action: 0, keycode: 29, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        invoke("sadb_send_keycode", { action: 1, keycode: 29, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        ctrlUp();
        return;
      }
      case "KeyC": { // Copy
        e.preventDefault();
        ctrlDown();
        invoke("sadb_send_keycode", { action: 0, keycode: 31, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        invoke("sadb_send_keycode", { action: 1, keycode: 31, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        ctrlUp();
        return;
      }
      case "KeyX": { // Cut
        e.preventDefault();
        ctrlDown();
        invoke("sadb_send_keycode", { action: 0, keycode: 52, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        invoke("sadb_send_keycode", { action: 1, keycode: 52, metastate: AMETA_CTRL_LEFT_ON }).catch(() => {});
        ctrlUp();
        return;
      }
      case "KeyV": { // Paste: use whichever clipboard (PC or phone) is more recent
        e.preventDefault();
        navigator.clipboard.readText()
          .then(text => { if (text) pcClipboard = { text, timestamp: Date.now() }; })
          .catch(() => {})
          .finally(() => {
            const usePc = pcClipboard &&
              (!phoneClipboard || pcClipboard.timestamp >= phoneClipboard.timestamp);
            const pasteText = usePc ? pcClipboard!.text : phoneClipboard?.text;
            if (pasteText) {
              lastSyncedText = pasteText;
              invoke("sadb_set_clipboard", { text: pasteText, paste: true }).catch(() => {});
            }
          });
        return;
      }
    }
  }
});

// Paste: intercept browser paste and forward to device clipboard
imeInput.addEventListener("paste", (e) => {
  if (!deviceW) return;
  e.preventDefault();
  const text = (e as ClipboardEvent).clipboardData?.getData("text/plain") || "";
  if (text) {
    lastSyncedText = text;
    invoke("sadb_set_clipboard", { text, paste: true }).catch(() => {});
  }
});

// 闁冲厜鍋撻柍鍏夊亾 Buttons 闁冲厜鍋撻柍鍏夊亾

sadbBtnStart.addEventListener("click", startStream);
sadbBtnStop.addEventListener("click", () => { setStatus("Stopping..."); stopStream(); });
sadbBtnScan.addEventListener("click", () => {
  setStatus("Scanning...");
  animateCapsule(400, 640);
  sadbDeviceWrapper.style.display = "flex"
  sadbDeviceWrapper.replaceChildren();
  void invoke('scan_adb_devices');
})
// 闁冲厜鍋撻柍鍏夊亾 Initial placeholder canvas 闁冲厜鍋撻柍鍏夊亾

sadbCanvas.width = 320;
sadbCanvas.height = 480;
ctx.fillStyle = "#0a0a0a";
ctx.fillRect(0, 0, sadbCanvas.width, sadbCanvas.height);

// 闁归潧顑嗗┃鈧弶鐑嗗枛缁?
const phoneX = 90, phoneY = 80, phoneW = 140, phoneH = 240, phoneR = 18;
ctx.strokeStyle = "rgba(255,255,255,0.12)";
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(phoneX + phoneR, phoneY);
ctx.lineTo(phoneX + phoneW - phoneR, phoneY);
ctx.arcTo(phoneX + phoneW, phoneY, phoneX + phoneW, phoneY + phoneR, phoneR);
ctx.lineTo(phoneX + phoneW, phoneY + phoneH - phoneR);
ctx.arcTo(phoneX + phoneW, phoneY + phoneH, phoneX + phoneW - phoneR, phoneY + phoneH, phoneR);
ctx.lineTo(phoneX + phoneR, phoneY + phoneH);
ctx.arcTo(phoneX, phoneY + phoneH, phoneX, phoneY + phoneH - phoneR, phoneR);
ctx.lineTo(phoneX, phoneY + phoneR);
ctx.arcTo(phoneX, phoneY, phoneX + phoneR, phoneY, phoneR);
ctx.closePath();
ctx.stroke();

// 閹煎瓨娲熼崕鏉懳熼鍛拫
const barW = 36, barY = phoneY + phoneH - 16;
ctx.strokeStyle = "rgba(255,255,255,0.08)";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(phoneX + (phoneW - barW) / 2, barY);
ctx.lineTo(phoneX + (phoneW + barW) / 2, barY);
ctx.stroke();

// 闁哄秴娲。?
ctx.fillStyle = "rgba(255,255,255,0.5)";
ctx.font = "600 13px system-ui";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("SADB", sadbCanvas.width / 2, phoneY + phoneH + 36);

// 闁告搩鍨遍悥锝嗭紣?
ctx.fillStyle = "rgba(255,255,255,0.28)";
ctx.font = "11px system-ui";
ctx.fillText("No device connected. Please scan or connect a device first.", sadbCanvas.width / 2, phoneY + phoneH + 58);


let resizeTimer: number | null = null;
export function initSadb() {
  updateDrawRect();
  new ResizeObserver(() => updateDrawRect()).observe(sadbCanvas);

  // 闁冲厜鍋撻柍鍏夊亾 Resize handle 闁冲厜鍋撻柍鍏夊亾
  let resizing = false;
  let resizeStartX = 0;
  let resizeStartScale = 1.0;

  const resizeHandle = $<HTMLDivElement>("sadb-resize-handle");
  let syncPending = false;

  resizeHandle.addEventListener("mousedown", (e) => {
    if (!deviceW) return;
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    resizeStartX = e.screenX;
    resizeStartScale = sadbScale;
    capsule.style.transition = "none";
    logi("[sadb-resize]", "mousedown: screenX=%d, scale=%.3f, initCapW=%d, initCapH=%d, capW=%d, capH=%d",
      e.screenX, sadbScale, initCapW, initCapH, capsule.offsetWidth, capsule.offsetHeight);
  });

  document.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    const dx = e.screenX - resizeStartX;
    const prevScale = sadbScale;
    sadbScale = resizeStartScale + (2 * dx) / initCapW;
    const { capW, capH } = getScaledSize();
    capsule.style.width = `${capW}px`;
    capsule.style.height = `${capH}px`;
    requestAnimationFrame(updateDrawRect);
    logi("[sadb-resize]", "move: dx=%d, scale %.3f闁?.3f, cap %dx%d, offsetW=%d",
      dx, prevScale, sadbScale, capW, capH, capsule.offsetWidth);
    
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!syncPending) {
        requestAnimationFrame(() => {
          syncPending = false;

          const { capW: sw, capH: sh } = getScaledSize();
          const bodyPad =
            parseFloat(getComputedStyle(document.body).paddingTop) || 5;

          logd(TAG, "sync_window_size:",`${sw}x${sh + bodyPad + 5}`);

          invoke("sync_window_size", {
            width: sw,
            height: sh + bodyPad + 5,
            reposition: false,
          }).catch(() => {});
        });
      }
    },5);
  });

  document.addEventListener("mouseup", async () => {
    if (!resizing) return;
    resizing = false;
    capsule.style.transition = "";
    const { capW: fw, capH: fh } = getScaledSize();
    const bodyPad = parseFloat(getComputedStyle(document.body).paddingTop) || 5;
    logi("[sadb-resize]", "mouseup: scale=%d/1000, sync %dx%d", Math.round(sadbScale * 1000), fw, fh + bodyPad + 5);
    try { await invoke("sync_window_size", { width: fw, height: fh + bodyPad + 5, reposition: false }); } catch { /* ignore */ }
  });
}

export function isSadbStreaming(): boolean {
  return streaming;
}

listen<AdbDevice>("mdns-found", (e)=>{
  let d = e.payload;
  console.log(d)
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
    selectIp = `${d.ip}:${d.port}` ? `${d.ip}:${d.port}` : null;
    setStatus(`Selected device ${title.textContent}`);
  });

  item.appendChild(title);
  item.appendChild(btn);
  sadbDeviceWrapper.appendChild(item);

})

listen("mdns-done", () => {
  if (sadbDeviceWrapper.children.length === 0) {
    setStatus("No connectable device.", true);
    sadbDeviceWrapper.style.display = "none";
  } else {
    setStatus("Scan complete.");
  }
})
