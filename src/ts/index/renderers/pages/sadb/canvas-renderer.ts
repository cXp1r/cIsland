import { loge, logi, logw } from "../../../../utils/logger";
import { sadbCanvas, sadbDeviceName, sadbFps, sadbResolution, sadbStatus } from "../../../doms";
import { pageStateMachine } from "../../../states";
import { animateCapsule } from "../../../utils/rAF";
import { Channel } from "@tauri-apps/api/core";

function setStatus(text: string, isError = false) {
  sadbStatus.textContent = text;
  sadbStatus.style.color = isError ? "#ff6f7f" : "#39d98a";
}

const machine = pageStateMachine.sadb;

export type PacketEvent =
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

declare const AudioDecoder: {
  new(init: { output: (audioData: SadbAudioData) => void; error: (error: Error) => void }): AudioDecoder;
};

declare const EncodedAudioChunk: {
  new(init: { type: "key" | "delta"; timestamp: number; data: ArrayBufferView | ArrayBuffer }): unknown;
};

const SADB_CAPSULE_CHROME_HEIGHT = 54;
const SADB_CAPSULE_MAX_EDGE = 560;
let activeSadbSessionId = 0;

function fitWithinMaxEdge(width: number, height: number, maxEdge: number): [number, number] {
  const edge = Math.max(width, height);
  if (!edge || !maxEdge) return [width, height];

  const scale = Math.min(1, maxEdge / edge);
  return [
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  ];
}


function updateDrawRect() {
  const cw = sadbCanvas.width;
  const ch = sadbCanvas.height;
  if (!cw || !ch) return;

  const rect = sadbCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const canvasAspect = cw / ch;
  const rectAspect = rect.width / rect.height;
  let drawRect = pageStateMachine.substates["sadb"].drawRect;

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
  buf.set(sps, i);
  i += sps.length;
  buf[i++] = 1;
  buf[i++] = (pps.length >> 8) & 0xff;
  buf[i++] = pps.length & 0xff;
  buf.set(pps, i);
  return buf.buffer;
}

function drawIdleScreen(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  canvas.width = 320;
  canvas.height = 480;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const phoneX = 90;
  const phoneY = 80;
  const phoneW = 140;
  const phoneH = 240;
  const phoneR = 18;

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

  const barW = 36;
  const barY = phoneY + phoneH - 16;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(phoneX + (phoneW - barW) / 2, barY);
  ctx.lineTo(phoneX + (phoneW + barW) / 2, barY);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 13px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SADB", canvas.width / 2, phoneY + phoneH + 36);

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "11px system-ui";
  ctx.fillText("No device connected. Please scan or connect a device first.", canvas.width / 2, phoneY + phoneH + 58);
}

export function invalidateSadbSession() {
  activeSadbSessionId++;
}

  const ctx = sadbCanvas.getContext("2d")!;

  let decoder: VideoDecoder | null = null;
  let pendingW = 0;
  let pendingH = 0;
  let frameCounter = 0;
  let lastFpsTick = performance.now();
  let audioCtx: AudioContext | null = null;
  let audioDecoder: AudioDecoder | null = null;
  let audioBaseTime = 0;
  let audioBasePts = 0;

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

  function renderFrame(frame: VideoFrame) {
    const resized = sadbCanvas.width !== frame.displayWidth || sadbCanvas.height !== frame.displayHeight;
    if (resized) {
      sadbCanvas.width = frame.displayWidth;
      sadbCanvas.height = frame.displayHeight;
      updateDrawRect();
    }
    ctx.drawImage(frame, 0, 0, sadbCanvas.width, sadbCanvas.height);
    frame.close();
    frameCounter++;
    tickFps();
  }

  function initDecoder(codec: string, width: number, height: number) {
    if (decoder) {
      try {
        decoder.close();
      } catch {
        /* ignore */
      }
    }
    pendingW = width;
    pendingH = height;
    decoder = new VideoDecoder({
      output: renderFrame,
      error: (error) => {
        loge("SADB", "VideoDecoder error:", error);
        setStatus(`VideoDecoder error: ${error.message}`, true);
      },
    });
    sadbCanvas.width = width;
    sadbCanvas.height = height;
    sadbResolution.textContent = `${width}x${height} (${codec})`;
    updateDrawRect();
  }

  function applyConfigPacket(data: Uint8Array) {
    if (!decoder) return;
    const nalus = splitAnnexB(data);
    const sps = nalus.find((n) => n.length > 0 && (n[0] & 0x1f) === 7);
    const pps = nalus.find((n) => n.length > 0 && (n[0] & 0x1f) === 8);
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

  function initAudioDecoder(configData: Uint8Array) {
    if (typeof AudioDecoder === "undefined") {
      logw("SADB", "AudioDecoder is not available in this browser");
      return;
    }
    if (configData.length < 19) {
      logw("SADB", "Opus config packet too short:", configData.length);
      return;
    }
    const channelCount = configData[9];
    const sampleRate = new DataView(configData.buffer, configData.byteOffset + 12, 4).getUint32(0, true);

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
      error: (error) => loge("SADB", "AudioDecoder error:", error),
    });

    audioDecoder.configure({
      codec: "opus",
      sampleRate,
      numberOfChannels: channelCount,
      description: configData,
    });
    logi("SADB", `AudioDecoder configured: opus ${sampleRate}Hz ${channelCount}ch`);
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

  function handleMeta(evt: Extract<PacketEvent, { type: "meta" }>) {
    sadbDeviceName.textContent = evt.device_name;
    machine.deviceW = evt.width;
    machine.mouseButtons = 0;
    initDecoder(evt.codec, evt.width, evt.height);
    setStatus("Mirroring...");
    pageStateMachine.substates["sadb"].dispatch({
      tag: "core",
      event: "start",
    });
    const [capsuleW, capsuleH] = fitWithinMaxEdge(evt.width, evt.height, SADB_CAPSULE_MAX_EDGE);
    animateCapsule(capsuleW, capsuleH + SADB_CAPSULE_CHROME_HEIGHT);
  }

  function handlePacket(evt: Extract<PacketEvent, { type: "packet" }>) {
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
    try {
      decoder.decode(chunk);
    } catch (error) {
      loge("SADB", "decode error:", error);
    }
  }

  function handleAudioPacket(evt: Extract<PacketEvent, { type: "audio_packet" }>) {
    const raw = base64ToBytes(evt.data);
    if (evt.config) {
      initAudioDecoder(raw);
      return;
    }
    decodeAudio(evt.pts, raw);
  }

  function handleError(evt: Extract<PacketEvent, { type: "error" }>) {
    setStatus(`Stream error: ${evt.message}`, true);
    pageStateMachine.substates["sadb"].dispatch({
      tag: "core",
      event: "stop",
    });
    reset()
    // todo 缁撴潫
  }

  function handleClosed() {
    setStatus("Stream closed");
    pageStateMachine.substates["sadb"].dispatch({
      tag: "core",
      event: "stop",
    });
    reset()
    // todo 缁撴潫
  }

  function handleEvent(evt: PacketEvent) {
    switch (evt.type) {
      case "meta":
        handleMeta(evt);
        break;
      case "packet":
        handlePacket(evt);
        break;
      case "audio_packet":
        handleAudioPacket(evt);
        break;
      case "error":
        handleError(evt);
        break;
      case "closed":
        handleClosed();
        break;
    }
  }

  function reset() {
    if (decoder) {
      try {
        decoder.close();
      } catch {
        /* ignore */
      }
      decoder = null;
    }
    if (audioDecoder) {
      try {
        audioDecoder.close();
      } catch {
        /* ignore */
      }
      audioDecoder = null;
    }
    if (audioCtx) {
      try {
        audioCtx.close();
      } catch {
        /* ignore */
      }
      audioCtx = null;
    }
    pendingW = 0;
    pendingH = 0;
    audioBaseTime = 0;
    audioBasePts = 0;
    frameCounter = 0;
    lastFpsTick = performance.now();
    machine.deviceW = 0;
    machine.mouseButtons = 0;
  }

  drawIdleScreen(sadbCanvas, ctx);



export function createSadbChannel() {
  const sessionId = ++activeSadbSessionId;
  const channel = new Channel<PacketEvent>();
  channel.onmessage = (evt) => {
    if (sessionId !== activeSadbSessionId) return;
    handleEvent(evt);
  };
  return channel;
}
