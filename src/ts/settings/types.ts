import { LargeNumberLike } from "crypto";
import type { MonitorInfo } from "./screens-frame";

export type SettingsResponse = {
  clipboard_enabled: boolean;
  shortcut_key: string;
  hide_and_see_key: string;
  search_shortcut: string;
  lyric_mode: string;
  lyric_ws_enabled: boolean;
  lyric_api_search_enabled: boolean;
  lyric_rust_api_enabled: boolean;
  lyric_offset_enabled: boolean;
  indicator_color: string;
  agent_window_size: string;
  weather_city: string;
  weather_lat: number;
  weather_lon: number;
  auto_start: boolean;
  log_level: string;
  log_filter_tags: string[];
  log_filter_invert: boolean;
  sadb_ip: string;
  sadb_port: number;
  email_poll_interval_secs: number;
  email_username: string;
  email_auth: string;
  email_address: string;
  email_port: number;
  email_shortcut: string;
  monitor_info: MonitorInfo[];
  primary_monitor_info: MonitorInfo;
  offset_x: number;
  offset_y: number;
};

export type ToolsSettingsResponse = {
  adb_install_dir: string;
  adb_path: string;
  aria2c_path: string;
  aria2c_thread: number;
  aria2c_rpc_port: number;
  aria2c_rpc_secret: string;
}

export type AISettingsResponse = {
  api_url: string;
  api_key: string;
  model: string;
  is_reasoning_model: boolean;
};

export type LinkHandler = {
  id: string;
  name: string;
  pattern: string;
  app_path: string;
  enabled: boolean;
};

export type PluginMarketRepairResult = {
  root: string;
  runtime_patched: boolean;
  archive_patched: boolean;
};

export type CheckResult = {
  ok: boolean;
  version: string;
  stdout: string;
  stderr: string;
};


export type TestResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type AdbCommandResult = {
  ok: boolean;
  adb_path: string;
  stdout: string;
  stderr: string;
};



export type AdbPathResult = {
  adb_path: string;
};

export type CityResult = {
  name: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
};

export type UpdateInfo = {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
  download_url: string;
  published_at: string;
  file_size: number;
};

export type InstallResult = {
  install_dir: string;
  path: string;
  downloaded_zip: string;
};

export type Aria2cRpcProgress = {
  progress: number,
  uuid: string,
  gid: string,
  speed: number,
}

export type Aria2cRpcEnd = {
  ok: boolean,
  path: string,
  filename: string,
  uuid: string,
}