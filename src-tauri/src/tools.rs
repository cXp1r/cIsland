use std::fs::{self, File};
use std::io::{self, Cursor, Read};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::Ordering;
use serde::{Deserialize, Serialize};
use zip::ZipArchive;
use crate::IslandState;
use crate::{CREATE_NO_WINDOW, logger};
use tauri::Emitter;
const PLATFORM_TOOLS_URL: &str = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";
const TAG: &str = "Tools";

use std::sync::LazyLock;
use regex::Regex;
static RE0: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(aria2-[\d\.]+)-win-64bit[^\.]+.zip").unwrap()
});


#[derive(Debug, Serialize)]
pub struct CheckResult {
    ok: bool,
    version: String,
    stdout: String,
    stderr: String,
}


#[derive(Debug, Serialize)]
pub struct InstallResult {
    install_dir: String,
    path: String,
    downloaded_zip: String,
}

#[derive(Debug, Serialize)]
pub struct TestResult {
    ok: bool,
    stdout: String,
    stderr: String,
}

use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn open_path(app: tauri::AppHandle, path: String) {
    app.opener()
        .open_path(path, None::<String>)
        .expect("failed to open");
}

#[tauri::command]
pub fn check(path: &str, tag: &str) -> Result<CheckResult, String> {
    let args = match tag {
        _ => vec!["--version"],
    };
    let output = Command::new(path)
        .args(&args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("failed to run {} {:?}: {}",path, args, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let version = stdout
        .lines()
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();

    Ok(CheckResult {
        ok: output.status.success(),
        version,
        stdout,
        stderr,
    })
}

#[tauri::command]
pub fn custom_caller(path: &str, args: Vec<&str>) -> Result<TestResult, String> {
    if path.ends_with("adb.exe") || path.ends_with("aria2c.exe") || path.ends_with("cc-hook.exe") {
        let output = Command::new(path)
            .args(&args)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("failed to run {} {:?}: {}",path, args, e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        Ok(TestResult {
            ok: output.status.success(),
            stdout,
            stderr,
        })
    } else {
        Err("Unauthorized command".into())
    }
    
}

#[tauri::command]
pub fn test(path: &str, tag: &str) -> Result<TestResult, String> {
    let args = match tag {
        "adb" => vec!["devices"],
        "aria2c" => vec!["-x", "16", "-s", "16", "https://github.com/cXp1r/tauri-island/blob/main/README.md"],
        _ => vec!["--version"],
    };
    let output = Command::new(path)
        .args(&args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("failed to run {} {:?}: {}",path, args, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();


    Ok(TestResult {
        ok: output.status.success(),
        stdout,
        stderr,
    })
}




fn extract_archive<R: io::Read + io::Seek>(archive: &mut ZipArchive<R>, install_dir: &Path) -> Result<(), String> {
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("failed to read zip entry: {}", e))?;
        let enclosed_name = entry
            .enclosed_name()
            .map(PathBuf::from)
            .ok_or_else(|| format!("unsafe zip entry path: {}", entry.name()))?;

        let stripped: PathBuf = enclosed_name
            .components()
            .skip(1)
            .collect();

        let out_path = install_dir.join(stripped);


        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| format!("failed to create dir {}: {}", out_path.display(), e))?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("failed to create dir {}: {}", parent.display(), e))?;
        }

        let mut outfile = File::create(&out_path).map_err(|e| format!("failed to create file {}: {}", out_path.display(), e))?;
        io::copy(&mut entry, &mut outfile).map_err(|e| format!("failed to extract file {}: {}", out_path.display(), e))?;
    }
    Ok(())
}



#[tauri::command]
pub fn find_path_by_where(name: &str) -> Result<String, String> {
    let output = Command::new("where")
        .arg(name)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("failed to run where {}: {}", name, e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !output.status.success() {
        return Err(format!("not found in PATH: {}", stderr.trim()));
    }

    Ok(stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .find(|path| path.exists())
        .ok_or_else(|| "not found in PATH".to_string())?
        .to_string_lossy()
        .to_string())
}



#[tauri::command]

pub fn tools_download_and_install_adb(
    install_dir: String
) -> Result<InstallResult, String> {

    let install_dir_path = Path::new(&install_dir);

    if install_dir_path.exists() {
        logger::debug(TAG, "文件已存在, 清空中");

        for entry in fs::read_dir(install_dir_path)
            .map_err(|e| format!("failed to read install dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("failed to read dir entry: {}", e))?;
            let path = entry.path();

            if path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("failed to remove dir {}: {}", path.display(), e))?;
            } else {
                fs::remove_file(&path)
                    .map_err(|e| format!("failed to remove file {}: {}", path.display(), e))?;
            }
        }
    }

    fs::create_dir_all(install_dir_path)
        .map_err(|e| format!("failed to create install dir: {}", e))?;


    let mut resp = crate::shared_http_client()
        .get(PLATFORM_TOOLS_URL)
        .send()
        .map_err(|e| format!("failed to download platform-tools: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "platform-tools download failed: HTTP {}",
            resp.status()
        ));
    }

    let mut buf: Vec<u8> = Vec::with_capacity(8 * 1024 * 1024);
    let mut temp = [0u8; 8192];

    loop {
        let n = resp
            .read(&mut temp)
            .map_err(|e| format!("stream read failed: {}", e))?;

        if n == 0 {
            break;
        }

        buf.extend_from_slice(&temp[..n]);
    }

    let cursor = std::io::Cursor::new(buf);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("archive: failed to read platform-tools zip: {}", e))?;

    extract_archive(&mut archive, install_dir_path)?;

    let adb_path = install_dir_path.join("adb.exe");

    if !adb_path.exists() {
        return Err(format!(
            "adb.exe not found after install: {}",
            adb_path.display()
        ));
    }

    Ok(InstallResult {
        install_dir,
        path: adb_path.to_string_lossy().into_owned(),
        downloaded_zip: "".to_string(),
    })
}



#[derive(Debug, Deserialize)]
pub struct GithubResult {
    pub tag_name: String,
    pub body: Option<String>,
    pub published_at: Option<String>,
    pub assets: Vec<Asserts>,
}
#[derive(Debug, Deserialize)]
pub struct Asserts {
    pub name: String,
    pub content_type: String,
    pub browser_download_url: String,
    pub size: u64,
}

pub fn get_latest_release(url: &str) -> Result<GithubResult, String> {
    let client = crate::shared_http_client();
    let resp = client
        .get(url)
        .header("User-Agent", "DynamicIsland-Updater")
        .header("Accept", "application/vnd.github+json")
        .send()
        .map_err(|e| {
            let msg = format!("请求失败: {}", e);
            crate::logger::warn(TAG, &msg);
            msg
        })?;

    let status = resp.status();
    crate::logger::info(TAG, &format!("GitHub API 响应: {}", status));

    if !status.is_success() {
        let body = resp.text().unwrap_or_else(|_| "<无法读取响应体>".to_string());
        let msg = format!("GitHub API 返回错误: {} | body: {}", status, body);
        crate::logger::warn(TAG, &msg);
        let friendly = if status.as_u16() == 403 && body.contains("rate limit") {
            "GitHub API 请求频率超限（每小时 60 次），请稍后再试".to_string()
        } else {
            format!("GitHub API 返回错误: {}", status)
        };
        return Err(friendly);
    }

    resp.json().map_err(|e| {
        let msg = format!("解析 JSON 失败: {}", e);
        crate::logger::warn(TAG, &msg);
        msg
    })
}

//以下为aria2c相关
#[tauri::command]
pub fn tools_downloader(idir: String, name: String) -> Result<InstallResult, String> {
    let (check, exe) = match name.as_str() {
        "aria2c" => {
            (&RE0, "aria2c.exe")
        },
        "adb" => {
            return tools_download_and_install_adb(idir);
        }
        _ => return Err("Unknown name".into()),
    };
    let install_dir_path = Path::new(&idir);
    // 清除已存在文件~
    if install_dir_path.exists() {
        logger::debug(TAG, "文件已存在, 清空中");
        for entry in fs::read_dir(install_dir_path)
            .map_err(|e| format!("failed to read install dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("failed to read dir entry: {}", e))?;
            let path = entry.path();
            if path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("failed to remove dir {}: {}", path.display(), e))?;
            } else {
                fs::remove_file(&path)
                    .map_err(|e| format!("failed to remove file {}: {}", path.display(), e))?;
            }
        }
    }
    fs::create_dir_all(install_dir_path).map_err(|e| format!("failed to create install dir: {}", e))?;

    let gr = get_latest_release("https://api.github.com/repos/aria2/aria2/releases/latest")?;
    for a in &gr.assets {
        if !a.content_type.ends_with("zip") { continue };
        if check.is_match(&a.name) {
            let resp = crate::shared_http_client()
                .get(&a.browser_download_url)
                .send()
                .map_err(|e| format!("failed to download {}: {}", name, e))?;

            if !resp.status().is_success() {
                return Err(format!("{} download failed: HTTP {}", name, resp.status()));
            }

            let bytes = resp
                .bytes()
                .map_err(|e| format!("failed to read {} zip: {}", name, e))?;

            let cursor = Cursor::new(bytes);
            let mut archive = ZipArchive::new(cursor).map_err(|e| format!("failed to read {} zip: {}", name, e))?;
            extract_archive(&mut archive, install_dir_path)?;
            return Ok(InstallResult {
                install_dir: idir.clone(),
                path: install_dir_path
                    .join(exe)
                    .to_string_lossy()
                    .to_string(),
                downloaded_zip: "".to_string(),
            })
        }
    }
    return Err("候选项里没有预期程序(包)".into())
}

use reqwest::Client;
use serde_json::json;

pub async fn add_uri(
    client: &Client,
    url: &str,
    secret: &str,
    port: u16,
    x: u8,
    dir: &str,
) -> Result<String, String> {

    let body = json!({
        "jsonrpc": "2.0",
        "id": "qwer",
        "method": "aria2.addUri",
        "params": [
            format!("token:{}", secret),
            [url],
            {
                "split": x,
                "max-connection-per-server": x,
                "dir": dir,
            }
        ]
    });

    let res = client
        .post(format!("http://127.0.0.1:{}/jsonrpc", port))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let value: serde_json::Value = res
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let gid = value["result"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(gid)
}

pub async fn tell_status(
    client: &Client,
    secret: &str,
    port: u16,
    gid: &str,
) -> Result<serde_json::Value, String> {

    let body = json!({
        "jsonrpc": "2.0",
        "id": "qwer",
        "method": "aria2.tellStatus",
        "params": [
            format!("token:{}", secret),
            gid
        ]
    });

    let res = client
        .post(format!("http://127.0.0.1:{}/jsonrpc", port))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let value = res
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(value)
}

#[tauri::command]
pub async fn aria2c_rpc_download(
    dir: &str,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, IslandState>,
    url: &str,
    uuid: &str,//前端会生成一个唯一uuid给core,进度条会根据uuid来选择,然后结束后告诉前端uuid来重置
) -> Result<(), String> {
    let client = state.aria2c_rpc_client.clone();
    let port = state.aria2c_rpc_port.load(Ordering::Relaxed);
    let secret = state.aria2c_rpc_secret.lock().unwrap().clone();
    let x = state.aria2c_thread.load(Ordering::Relaxed);

    let gid = add_uri(&client, &url, &secret, port, x, dir).await?;

    let client_clone = client.clone();
    let win = window.clone();
    let uuid = uuid.to_string();
    tokio::spawn(async move {

        loop {

            let status = tell_status(
                &client_clone,
                &secret,
                port,
                &gid
            ).await;

            if let Ok(v) = status {

                let result = &v["result"];

                let completed: f64 = result["completedLength"]
                    .as_str()
                    .unwrap_or("0")
                    .parse()
                    .unwrap_or(0.0);

                let total: f64 = result["totalLength"]
                    .as_str()
                    .unwrap_or("1")
                    .parse()
                    .unwrap_or(1.0);

                let speed = result["downloadSpeed"]
                    .as_str()
                    .unwrap_or("0");

                let progress = completed / total;
                let _ = win.emit("aria2c-rpc-progress", serde_json::json!({
                    "gid": gid,
                    "progress": progress,
                    "speed": speed,
                    "uuid": &uuid,
                }));

                let status_str = result["status"]
                    .as_str()
                    .unwrap_or("");

                if status_str == "complete" {
                    let path = result["files"]
                        .as_array()
                        .and_then(|files| files.first())
                        .and_then(|f| f["path"].as_str())
                        .unwrap_or("");

                    let filename = std::path::Path::new(path)
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("");

                    let _ = win.emit("aria2c-rpc-end", serde_json::json!({
                        "ok": if filename.is_empty() { false } else {true},
                        "path": path,
                        "filename": filename,
                        "uuid": &uuid,
                    }));

                    break;
                }

                if status_str == "error" || status_str == "removed" {
                    let _ = win.emit("aria2c-rpc-end", serde_json::json!({
                        "ok": false,
                        "uuid": &uuid,
                    }));
                    break;
                }
            }

            tokio::time::sleep(
                std::time::Duration::from_secs(1)
            ).await;
        }
    });

    Ok(())
}