use std::fs::{self, File};
use std::io::{self, Read};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::LazyLock;
use std::time::{SystemTime, UNIX_EPOCH};
use regex::Regex;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri_plugin_opener::OpenerExt;
use zip::ZipArchive;
use crate::IslandState;
use crate::{CREATE_NO_WINDOW, logger};
use tauri::Emitter;

const PLATFORM_TOOLS_URL: &str = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";
const TAG: &str = "Tools";

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
}

#[derive(Debug, Serialize)]
pub struct TestResult {
    ok: bool,
    stdout: String,
    stderr: String,
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

#[derive(Debug, Clone)]
pub struct Aria2cRpc {
    pub client: Client,
    pub port: u16,
    pub secret: String,
    pub thread: u8,
}

fn local_backup_suffix() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}bak", secs)
}

fn backup_install_dir_if_needed(install_dir_path: &Path) -> Result<(), String> {
    if !install_dir_path.exists() {
        return Ok(());
    }

    let should_backup = if install_dir_path.is_dir() {
        let mut entries = fs::read_dir(install_dir_path)
            .map_err(|e| format!("读取安装目录失败 {}: {}", install_dir_path.display(), e))?;
        entries
            .next()
            .transpose()
            .map_err(|e| format!("读取安装目录内容失败 {}: {}", install_dir_path.display(), e))?
            .is_some()
    } else {
        true
    };

    if !should_backup {
        return Ok(());
    }

    let name = install_dir_path
        .file_name()
        .ok_or_else(|| format!("安装目录名称无效: {}", install_dir_path.display()))?
        .to_string_lossy();
    let parent = install_dir_path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let suffix = local_backup_suffix();
    let mut backup_path = parent.join(format!("{}{}", name, suffix));
    let mut index = 1;

    while backup_path.exists() {
        backup_path = parent.join(format!("{}{}-{}", name, suffix, index));
        index += 1;
    }

    logger::debug(
        TAG,
        &format!(
            "安装目录已存在，备份到 {}",
            backup_path.display()
        ),
    );
    fs::rename(install_dir_path, &backup_path).map_err(|e| {
        format!(
            "备份安装目录失败 {} -> {}: {}",
            install_dir_path.display(),
            backup_path.display(),
            e
        )
    })?;

    Ok(())
}


#[tauri::command]
pub fn open_path(app: tauri::AppHandle, path: String) {
    app.opener()
        .open_path(path, None::<String>)
        .expect("failed to open");
}

#[tauri::command]
pub fn select_folder(default_dir: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();

    if let Some(default_dir) = default_dir {
        let default_path = PathBuf::from(default_dir);
        if default_path.is_dir() {
            dialog = dialog.set_directory(default_path);
        }
    }

    Ok(dialog
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string()))
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
    })
}

pub fn get_latest_release(url: &str, auth: Option<&str>) -> Result<GithubResult, String> {
    let client = crate::shared_http_client();
    let resp = match auth {
        Some(a) => {
            client
                .get(url)
                .header("User-Agent", "DynamicIsland-Updater")
                .header("Accept", "application/vnd.github+json")
                .header("Authorization", format!("Bearer {}", a))
                .send()
                .map_err(|e| {
                    let msg = format!("请求失败: {}", e);
                    crate::logger::warn(TAG, &msg);
                    msg
                })?
        },
        None => {
            client
                .get(url)
                .header("User-Agent", "DynamicIsland-Updater")
                .header("Accept", "application/vnd.github+json")
                .send()
                .map_err(|e| {
                    let msg = format!("请求失败: {}", e);
                    crate::logger::warn(TAG, &msg);
                    msg
                })?
        }
    };

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

fn accept_aria2_asset(asset: &Asserts) -> bool {
    asset.content_type.ends_with("zip") && RE0.is_match(&asset.name)
}

fn accept_hook_asset(asset: &Asserts) -> bool {
    asset.name == "cc-hook-core.exe"
}


fn download_from_github_matching<F>(
    idir: &str,
    short_link: &str,
    is_aria2c_rpc: bool,
    mut accept: F,
) -> Result<String, String>
//接收一个用于判断是否继续的闭包
where
    F: FnMut(&Asserts) -> bool,
{
    let install_dir_path = Path::new(idir);
    fs::create_dir_all(install_dir_path)
        .map_err(|e| format!("failed to create install dir: {}", e))?;
    //先占位
    let link = format!("https://api.github.com/repos/{}/releases/latest", short_link);
    let gr = get_latest_release(&link, None)?;
    for a in &gr.assets {
        if !accept(a) { continue; }

        if is_aria2c_rpc {
            return Err("aria2c RPC 下载分支待实现".into());
        }

        let file_name = Path::new(&a.name)
            .file_name()
            .ok_or_else(|| format!("GitHub asset 文件名无效: {}", a.name))?;
        let file_path = install_dir_path.join(file_name);
        let mut resp = crate::shared_http_client()
            .get(&a.browser_download_url)
            .send()
            .map_err(|e| format!("failed to download {}: {}", a.name, e))?;

        if !resp.status().is_success() {
            return Err(format!("{} download failed: HTTP {}", a.name, resp.status()));
        }

        let mut file = File::create(&file_path)
            .map_err(|e| format!("failed to create download file {}: {}", file_path.display(), e))?;
        io::copy(&mut resp, &mut file)
            .map_err(|e| format!("failed to save download file {}: {}", file_path.display(), e))?;

        return Ok(file_path.to_string_lossy().to_string());
    }

    Err("候选项里没有预期程序(包)".into())
}


#[tauri::command]
pub async fn tools_downloader(idir: String, name: String, ) -> Result<InstallResult, String> {
    tauri::async_runtime::spawn_blocking(move || tools_downloader_blocking(idir, name))
        .await
        .map_err(|e| format!("tools_downloader 子线程执行失败: {}", e))?
}

fn tools_downloader_blocking(idir: String, name: String) -> Result<InstallResult, String> {
    let (exe, accept, short_link): (&str, fn(&Asserts) -> bool, &str) = match name.as_str() {
        "aria2c" => {
            ("aria2c.exe", accept_aria2_asset, "aria2/aria2")
        },
        "hook" => {
            ("cc-hook-core.exe", accept_hook_asset, "cXp1r/cc-hook-core")
        },
        "adb" => {
            return tools_download_and_install_adb(idir);
        }
        _ => return Err("Unknown name".into()),
    };
    let install_dir_path = Path::new(&idir);
    backup_install_dir_if_needed(install_dir_path)?;
    fs::create_dir_all(install_dir_path).map_err(|e| format!("failed to create install dir: {}", e))?;

    let path = download_from_github_matching(
        &idir,
        short_link,
        false,
        accept,
    )?;
    println!("{path}");
    if path.ends_with(".exe") {
        Ok(InstallResult {
            install_dir: idir.clone(),
            path,
        })
    } else if path.ends_with(".zip") {
        let file = File::open(&path)
            .map_err(|e| format!("failed to open downloaded zip {}: {}", path, e))?;
        let mut archive = ZipArchive::new(file)
            .map_err(|e| format!("failed to read {} zip: {}", name, e))?;
        extract_archive(&mut archive, install_dir_path)?;

        Ok(InstallResult {
            install_dir: idir.clone(),
            path: install_dir_path
                .join(exe)
                .to_string_lossy()
                .to_string(),
        })
    } else {
        Err("Unknown content type".into())
    }
    
}

impl Aria2cRpc {
    async fn add_uri(&self, url: &str, dir: &str) -> Result<String, String> {
        let body = json!({
            "jsonrpc": "2.0",
            "id": "qwer",
            "method": "aria2.addUri",
            "params": [
                format!("token:{}", self.secret),
                [url],
                {
                    "split": self.thread,
                    "max-connection-per-server": self.thread,
                    "dir": dir,
                }
            ]
        });

        let res = self
            .client
            .post(format!("http://127.0.0.1:{}/jsonrpc", self.port))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let value: serde_json::Value = res
            .json()
            .await
            .map_err(|e| e.to_string())?;

        Ok(value["result"].as_str().unwrap_or("").to_string())
    }

    async fn tell_status(&self, body: &serde_json::Value) -> Result<serde_json::Value, String> {
        let res = self
            .client
            .post(format!("http://127.0.0.1:{}/jsonrpc", self.port))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        res.json::<serde_json::Value>()
            .await
            .map_err(|e| e.to_string())
    }

    async fn force_remove(&self, gid: &str) -> Result<serde_json::Value, String> {
        let body = json!({
                    "jsonrpc": "2.0",
                    "id": "qwer",
                    "method": "aria2.forceRemove",
                    "params": [
                        format!("token:{}", self.secret),
                        gid
                    ]
                });
        let res = self
            .client
            .post(format!("http://127.0.0.1:{}/jsonrpc", self.port))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        res.json::<serde_json::Value>()
            .await
            .map_err(|e| e.to_string())
    }
    //前端会生成一个唯一uuid给core,进度条会根据uuid来选择,然后结束后告诉前端uuid来重置
    pub async fn new_task(&self, dir: &str, url: &str, uuid: &str, window: Option<tauri::WebviewWindow>) -> Result<(), String> {
        let gid = self.add_uri(url, dir).await?;

        let rpc = self.clone();
        let uuid = uuid.to_string();
        let body = json!({
            "jsonrpc": "2.0",
            "id": "qwer",
            "method": "aria2.tellStatus",
            "params": [
                format!("token:{}", self.secret),
                gid
            ]
        });
        
        match window {
            Some(win) => {
                tokio::spawn(async move {
                    loop {
                        let status = rpc.tell_status(&body).await;
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
            },
            None => {
                tokio::spawn(async move {
                    loop {
                        let status = rpc.tell_status(&body).await;
                        if let Ok(v) = status {
                            let result = &v["result"];

                            let status_str = result["status"]
                                .as_str()
                                .unwrap_or("");

                            if status_str == "complete" {
                                break;
                            }

                            if status_str == "error" || status_str == "removed" {
                                break;
                            }
                        }
                        tokio::time::sleep(
                            std::time::Duration::from_secs(1)
                        ).await;
                    }
                });

            }
        }
        //这个地方ok没有任何意义的
        Ok(())
    }
}




#[tauri::command]
pub async fn aria2c_rpc_download(
    dir: &str,
    window: tauri::WebviewWindow,
    state: tauri::State<'_, IslandState>,
    url: &str,
    uuid: &str,
) -> Result<(), String> {
    let ar = state.aria2c_rpc.lock().unwrap().clone();

    match ar {
        Some(ar) => ar.new_task(dir, url, uuid, Some(window.clone())).await,
        None => {
            logger::warn("Aria2cRpc", "Aria2c Rpc Server Not Found");
            Err("Aria2c Rpc Server Not Found".into())
        }
    }
}


#[tauri::command]
pub async fn aria2c_rpc_remove(state: tauri::State<'_, IslandState>, gid: &str) -> Result<(), String> {
    let ar = state.aria2c_rpc.lock().unwrap().clone();

    match ar {
        Some(ar) => {
            logger::debug("Aria2cRpc", &format!("{:?}", ar.force_remove(gid).await?));
            Ok(())
        },
        None => {
            logger::warn("Aria2cRpc", "Aria2c Rpc Server Not Found");
            Err("Aria2c Rpc Server Not Found".into())
        }
    }
}
