use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum AgentChoice {
    Claude,
    Codex,
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentHooksInstallResult {
    pub agent: String,
    pub ipc_helper_path: String,
    pub targets: Vec<String>,
}

fn windows_home_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(env::var("USERPROFILE").expect("USERPROFILE not set"))
    }

    #[cfg(not(target_os = "windows"))]
    {
        PathBuf::from(env::var("HOME").expect("HOME not set"))
    }
}

fn claude_global_settings_path() -> PathBuf {
    windows_home_dir().join(".claude").join("settings.json")
}

fn codex_global_paths() -> [PathBuf; 2] {
    let base = windows_home_dir().join(".codex");
    [base.join("hooks.json"), base.join("config.toml")]
}

fn create_parent_dirs(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create parent dir {}: {}", parent.display(), e))?;
        }
    }

    Ok(())
}

fn backup_if_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    let backup = match path.extension().and_then(|ext| ext.to_str()) {
        Some("toml") => path.with_extension("toml.bak"),
        Some("json") => path.with_extension("json.bak"),
        _ => path.with_extension("bak"),
    };

    fs::copy(path, &backup)
        .map_err(|e| format!("failed to create backup {} -> {}: {}", path.display(), backup.display(), e))?;

    println!("Backup created at: {}", backup.display());
    Ok(())
}

fn make_ipc_hook(ipc_helper: &Path, agent: &str) -> Value {
    json!({
        "type": "command",
        "command": format!("\"{}\" {}", ipc_helper.display(), agent)
    })
}

fn build_hooks(ipc_helper: &Path, agent: &str) -> Value {
    json!({
        "PostToolUseFailure": [{
            "matcher": ".*",
            "hooks": [make_ipc_hook(ipc_helper, agent)]
        }],
        "PermissionRequest": [{
            "matcher": ".*",
            "hooks": [make_ipc_hook(ipc_helper, agent)]
        }],
        "Stop": [{
            "hooks": [make_ipc_hook(ipc_helper, agent)]
        }],
        "SubagentStop": [{
            "hooks": [make_ipc_hook(ipc_helper, agent)]
        }],
        "PreCompact": [{
            "hooks": [make_ipc_hook(ipc_helper, agent)]
        }]
    })
}

fn set_codex_hooks_enabled(content: &str) -> String {
    let mut lines: Vec<String> = content.lines().map(|line| line.to_string()).collect();
    let mut features_start: Option<usize> = None;
    let mut features_end = lines.len();

    for (idx, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed == "[features]" {
            features_start = Some(idx);
            continue;
        }

        if features_start.is_some() && trimmed.starts_with('[') && trimmed.ends_with(']') {
            features_end = idx;
            break;
        }
    }

    match features_start {
        Some(start) => {
            let mut found = false;

            for idx in start + 1..features_end {
                if lines[idx].trim_start().starts_with("codex_hooks") {
                    lines[idx] = "codex_hooks = true".to_string();
                    found = true;
                    break;
                }
            }

            if !found {
                lines.insert(features_end, "codex_hooks = true".to_string());
            }

            lines.join("\n")
        }
        None => {
            let mut output = String::new();
            if !content.trim().is_empty() {
                output.push_str(content.trim_end());
                output.push('\n');
            }
            output.push_str("[features]\n");
            output.push_str("codex_hooks = true");
            output
        }
    }
}

fn parse_agent(name: &str) -> Option<AgentChoice> {
    match name.trim().to_ascii_lowercase().as_str() {
        "claude" => Some(AgentChoice::Claude),
        "codex" => Some(AgentChoice::Codex),
        "both" => None,
        _ => None,
    }
}

fn expand_requested_agents(agents: Vec<String>) -> Result<Vec<AgentChoice>, String> {
    let mut requested = Vec::new();
    let mut seen = HashSet::new();
    let mut invalid = Vec::new();

    for raw in agents {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }

        match trimmed.to_ascii_lowercase().as_str() {
            "both" => {
                for choice in [AgentChoice::Claude, AgentChoice::Codex] {
                    if seen.insert(choice) {
                        requested.push(choice);
                    }
                }
            }
            _ => match parse_agent(trimmed) {
                Some(choice) => {
                    if seen.insert(choice) {
                        requested.push(choice);
                    }
                }
                None => invalid.push(trimmed.to_string()),
            },
        }
    }

    if !invalid.is_empty() {
        return Err(format!("unsupported agent name(s): {}", invalid.join(", ")));
    }

    if requested.is_empty() {
        return Err("no valid agent names were provided".into());
    }

    Ok(requested)
}

fn ensure_claude_settings(ipc_helper: &Path) -> Result<String, String> {
    let config_path = claude_global_settings_path();
    create_parent_dirs(&config_path)?;

    if !config_path.exists() {
        fs::write(&config_path, "{}")
            .map_err(|e| format!("failed to create {}: {}", config_path.display(), e))?;
        println!("Created file at: {}", config_path.display());
    } else {
        backup_if_exists(&config_path)?;
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("failed to read {}: {}", config_path.display(), e))?;
    let mut config: Value = serde_json::from_str(&content).unwrap_or(json!({}));

    config["hooks"] = build_hooks(ipc_helper, "claude");

    let output = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("failed to serialize Claude config: {}", e))?;
    fs::write(&config_path, output)
        .map_err(|e| format!("failed to write {}: {}", config_path.display(), e))?;

    Ok(config_path.to_string_lossy().into_owned())
}

fn ensure_codex_settings(ipc_helper: &Path) -> Result<Vec<String>, String> {
    let [hooks_path, config_path] = codex_global_paths();
    create_parent_dirs(&hooks_path)?;
    create_parent_dirs(&config_path)?;

    if !hooks_path.exists() {
        fs::write(&hooks_path, "{}")
            .map_err(|e| format!("failed to create {}: {}", hooks_path.display(), e))?;
        println!("Created file at: {}", hooks_path.display());
    } else {
        backup_if_exists(&hooks_path)?;
    }

    if !config_path.exists() {
        fs::write(&config_path, "")
            .map_err(|e| format!("failed to create {}: {}", config_path.display(), e))?;
        println!("Created file at: {}", config_path.display());
    } else {
        backup_if_exists(&config_path)?;
    }

    let hooks_content = fs::read_to_string(&hooks_path)
        .map_err(|e| format!("failed to read {}: {}", hooks_path.display(), e))?;
    let mut hooks_config: Value = serde_json::from_str(&hooks_content).unwrap_or(json!({}));

    let config_content = fs::read_to_string(&config_path)
        .map_err(|e| format!("failed to read {}: {}", config_path.display(), e))?;
    let updated_config = set_codex_hooks_enabled(&config_content);
    fs::write(&config_path, updated_config)
        .map_err(|e| format!("failed to write {}: {}", config_path.display(), e))?;

    hooks_config["hooks"] = build_hooks(ipc_helper, "codex");
    let output = serde_json::to_string_pretty(&hooks_config)
        .map_err(|e| format!("failed to serialize Codex hooks config: {}", e))?;
    fs::write(&hooks_path, output)
        .map_err(|e| format!("failed to write {}: {}", hooks_path.display(), e))?;

    Ok(vec![
        hooks_path.to_string_lossy().into_owned(),
        config_path.to_string_lossy().into_owned(),
    ])
}

#[tauri::command]
pub fn install_agent_hooks(
    agents: Vec<String>,
    ipc_helper: String,
) -> Result<Vec<AgentHooksInstallResult>, String> {
    let requested = expand_requested_agents(agents)?;
    let ipc_helper = ipc_helper.trim();

    if ipc_helper.is_empty() {
        return Err("IPC helper path is empty".into());
    }

    let ipc_helper = PathBuf::from(ipc_helper);

    if !ipc_helper.exists() {
        return Err(format!(
            "IPC helper not found: {}. Download the hook core into the frontend-selected install directory first.",
            ipc_helper.display()
        ));
    }

    if !ipc_helper.is_file() {
        return Err(format!("IPC helper is not a file: {}", ipc_helper.display()));
    }

    let mut results = Vec::new();

    for agent in requested {
        match agent {
            AgentChoice::Claude => {
                let target = ensure_claude_settings(&ipc_helper)?;
                results.push(AgentHooksInstallResult {
                    agent: "claude".to_string(),
                    ipc_helper_path: ipc_helper.to_string_lossy().into_owned(),
                    targets: vec![target],
                });
            }
            AgentChoice::Codex => {
                let targets = ensure_codex_settings(&ipc_helper)?;
                results.push(AgentHooksInstallResult {
                    agent: "codex".to_string(),
                    ipc_helper_path: ipc_helper.to_string_lossy().into_owned(),
                    targets,
                });
            }
        }
    }
    
    Ok(results)
}
