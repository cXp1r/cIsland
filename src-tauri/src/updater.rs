use std::fs;
use std::io::Write;
use std::process::Command;
use std::os::windows::process::CommandExt;
use serde::Serialize;
use tauri::Emitter;

use crate::CREATE_NO_WINDOW;

const GITHUB_API_URL: &str =
    "https://api.github.com/repos/Python-island/Python-island/releases/latest";
const GITHUB_PREVIEW_API_URL: &str =
    "https://api.github.com/repos/cXp1r/tauri-island/releases/latest";

#[tauri::command]
pub fn get_app_version(app: tauri::AppHandle) -> String {
    app.config().version.clone().unwrap_or_else(|| "unknown".to_string())
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub download_url: String,
    pub published_at: String,
    pub file_size: u64,
}

/// 简单的 semver 比较: 返回 true 表示 latest > current
fn is_newer_version(current: &str, latest: &str) -> bool {
    let parse = |v: &str| -> Vec<u64> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse::<u64>().ok())
            .collect()
    };
    let c = parse(current);
    let l = parse(latest);
    for i in 0..3 {
        let cv = c.get(i).copied().unwrap_or(0);
        let lv = l.get(i).copied().unwrap_or(0);
        if lv > cv {
            return true;
        }
        if lv < cv {
            return false;
        }
    }
    false
}

#[tauri::command]
pub fn check_for_updates(app: tauri::AppHandle, preview: Option<bool>) -> Result<UpdateInfo, String> {
    let is_preview = preview.unwrap_or(false);
    let current_version = app.config().version.clone().unwrap_or_default();

    let api_url = if is_preview { GITHUB_PREVIEW_API_URL } else { GITHUB_API_URL };

    crate::logger::info("Updater", &format!(
        "check for updates channel={} url={} current_version={}",
        if is_preview { "preview" } else { "stable" },
        api_url,
        current_version
    ));

    let release = crate::tools::get_latest_release(api_url, None)?;

    let tag = &release.tag_name;
    let latest_version = if tag.starts_with("tauri-v") {
        tag.trim_start_matches("tauri-v").to_string()
    } else if is_preview {
        let mut ver = tag.clone();
        for asset in &release.assets {
            if asset.name.starts_with("DynamicIsland_") && asset.name.ends_with(".exe") {
                let stripped = asset.name.trim_start_matches("DynamicIsland_");
                if let Some(v) = stripped.split('_').next() {
                    ver = v.to_string();
                }
                break;
            }
        }
        ver
    } else {
        tag.trim_start_matches('v').to_string()
    };

    let release_notes = release.body.unwrap_or_default();
    let published_at = release.published_at.unwrap_or_default();

    // 查找 .exe 安装包的下载地址
    let mut download_url = String::new();
    let mut file_size: u64 = 0;

    for asset in &release.assets {
        if asset.name.ends_with(".exe") {
            download_url = asset.browser_download_url.clone();
            file_size = asset.size;
            break;
        }
    }

    if download_url.is_empty() {
        crate::logger::warn("Updater", "failed to find installer");
        return Err("not found".to_string());
    }

    crate::logger::info("Updater", &format!(
        "latest_version={} download_url={} size={}",
        latest_version, download_url, file_size
    ));

    let has_update = is_newer_version(&current_version, &latest_version);

    Ok(UpdateInfo {
        has_update,
        current_version,
        latest_version,
        release_notes,
        download_url,
        published_at,
        file_size,
    })
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
    percent: f64,
}

#[tauri::command]
pub fn download_and_install_update(app: tauri::AppHandle, url: String) {
    std::thread::spawn(move || {
        if let Err(e) = do_download_and_install(&app, &url) {
            println!("[Updater] failed to download: {}", e);
            let _ = app.emit("update-error", e);
        }
    });
}

fn do_download_and_install(app: &tauri::AppHandle, url: &str) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Client error: {}", e))?;

    let resp = client
        .get(url)
        .header("User-Agent", "DynamicIsland-Updater")
        .send()
        .map_err(|e| format!("request error: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("error from resp: {}", resp.status()));
    }

    let total = resp.content_length().unwrap_or(0);

    // 提取文件名
    let file_name = url
        .rsplit('/')
        .next()
        .unwrap_or("DynamicIsland_update.exe");

    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(file_name);

    // 读取全部内容（reqwest blocking 不支持分块读取进度，用 copy 方式）
    // 为了实现进度回报，逐块读取
    let bytes = resp.bytes().map_err(|e| format!("read error: {}", e))?;
    let total = if total > 0 { total } else { bytes.len() as u64 };

    // 写入文件并发送进度
    let chunk_size = 64 * 1024; // 64KB
    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("failed to create temp folder: {}", e))?;

    let mut downloaded: u64 = 0;
    for chunk in bytes.chunks(chunk_size) {
        file.write_all(chunk)
            .map_err(|e| format!("failed to write: {}", e))?;
        downloaded += chunk.len() as u64;
        let percent = if total > 0 {
            (downloaded as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        let _ = app.emit(
            "update-download-progress",
            DownloadProgress {
                downloaded,
                total,
                percent,
            },
        );
    }

    // 确保文件句柄关闭，否则启动安装程序时会报 OS Error 32
    drop(file);

    let _ = app.emit("update-download-complete", serde_json::json!({}));

    println!("[Updater] 下载完成: {:?}", file_path);

    // 启动安装程序
    let _ = Command::new(&file_path)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("failed to start installer: {}", e))?;

    // 退出当前应用
    app.exit(0);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_newer_version() {
        assert!(is_newer_version("0.2.2", "0.3.0"));
        assert!(is_newer_version("0.2.2", "0.2.3"));
        assert!(is_newer_version("0.2.2", "1.0.0"));
        assert!(!is_newer_version("0.2.2", "0.2.2"));
        assert!(!is_newer_version("0.3.0", "0.2.2"));
        assert!(!is_newer_version("1.0.0", "0.9.9"));
    }
}
