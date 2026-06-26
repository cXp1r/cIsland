pub(crate) mod lyrics;
pub(crate) mod media;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use lyrix::Lyrix;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::{logger, settings, IslandState};

pub(crate) fn spawn_music_monitor(
    window: WebviewWindow,
    lyric_mode: Arc<Mutex<String>>,
    is_music: Arc<AtomicBool>,
    lyric_offset_enabled: Arc<AtomicBool>,
    lyric_offsets_by_player: Arc<Mutex<HashMap<String, i64>>>,
    active_player_app_id: Arc<Mutex<Option<String>>>,
    app_handle: AppHandle,
    lyrix: Arc<Lyrix>,
) {
    let lyrics_result: Arc<Mutex<Option<(u64, Vec<lyrics::LyricLine>, bool)>>> =
        Arc::new(Mutex::new(None));
    let lyrics_generation = Arc::new(AtomicU64::new(0));

    // 启动音乐监控线程：负责轮询 SMTC、切歌识别、歌词拉取和前端事件推送。
    thread::spawn(move || {
        let mut current_lyrics: Vec<lyrics::LyricLine> = Vec::new();
        let mut current_track = String::new();
        let mut last_lyric_text = String::new();
        let mut last_info_track = String::new();
        let mut was_playing = false;
        let mut last_is_playing = false;
        let mut lyrics_not_found = false;
        let mut current_gen: u64 = 0;
        let mut fetch_pending = false;
        let mut no_session_count: u32 = 0;
        const NO_SESSION_GRACE_CYCLES: u32 = 63;
        
        loop {
            thread::sleep(Duration::from_millis(80));

            // 接收异步歌词结果：只接受当前歌曲 generation 对应的结果。
            {
                let mut result = lyrics_result.lock().unwrap_or_else(|e| e.into_inner());
                if let Some((gen, ref lyric_lines, not_found)) = result.take() {
                    if gen == current_gen {
                        current_lyrics = lyric_lines.clone();
                        lyrics_not_found = not_found;
                        fetch_pending = false;
                        last_lyric_text.clear();
                        last_info_track.clear();
                    }
                }
            }

            // 歌词模式关闭时直接结束监控线程，后续重新开启由外部再启动。
            let mode = lyric_mode.lock().unwrap().clone();
            if mode == "off" {
                logger::warn("Lyrics", "music monitor stopped: lyric_mode is off");
                is_music.store(false, Ordering::Relaxed);
                let _ = window.emit("lyric-update", serde_json::json!(null));
                let _ = window.emit("music-page", false);
                return;
            }

            // 读取当前 SMTC 会话；短暂丢会话时给播放器切歌留宽限期。
            let info = media::get_smtc_media_info();
            let (status, media_info, position_ms_raw, is_playing, raw_app_id, thumbnail) = match info {
                Some(v) => {
                    no_session_count = 0;
                    v
                }
                None => {
                    if was_playing {
                        no_session_count = no_session_count.saturating_add(1);
                        if no_session_count < NO_SESSION_GRACE_CYCLES {
                            continue;
                        }
                        logger::warn(
                            "Lyrics",
                            "playback state=stopped reason=no_smtc_session (grace expired)",
                        );
                        no_session_count = 0;
                        was_playing = false;
                        last_is_playing = false;
                        current_track.clear();
                        is_music.store(false, Ordering::Relaxed);
                        let _ = window.emit("lyric-update", serde_json::json!(null));
                        let _ = window.emit("music-page", false);
                    }
                    continue;
                }
            };

            if status == 4 {
                if was_playing {
                    logger::warn(
                        "Lyrics",
                        "playback state=stopped reason=smtc_session_closed",
                    );
                    was_playing = false;
                    last_is_playing = false;
                    current_track.clear();
                    is_music.store(false, Ordering::Relaxed);
                    let _ = window.emit("lyric-update", serde_json::json!(null));
                    let _ = window.emit("music-page", false);
                }
                continue;
            }

            let app_id = settings::normalize_app_id(&raw_app_id);

            // 同步当前命中的播放器 app_id，供设置页高亮和歌词偏移配置使用。
            {
                let mut active = active_player_app_id.lock().unwrap();
                let changed = active.as_deref() != Some(app_id.as_str());
                if changed {
                    *active = Some(app_id.clone());
                }
            }

            // 计算播放器专属歌词偏移；新播放器首次出现时自动入表并落盘。
            let offset_ms = {
                let needs_insert = !app_id.is_empty() && {
                    let map = lyric_offsets_by_player.lock().unwrap();
                    !map.contains_key(&app_id)
                };
                if needs_insert {
                    {
                        let mut map = lyric_offsets_by_player.lock().unwrap();
                        map.entry(app_id.clone()).or_insert(0);
                    }
                    let state_ref = app_handle.state::<IslandState>();
                    let data = settings::build_settings_data(&state_ref);
                    if let Err(e) = settings::save_settings_to_file(&data) {
                        logger::warn(
                            "Lyrics",
                            &format!("persist lyric_offsets_by_player failed: {}", e),
                        );
                    }
                }
                let map = lyric_offsets_by_player.lock().unwrap();
                *map.get(&app_id).unwrap_or(&0)
            };

            let offset_enabled = lyric_offset_enabled.load(Ordering::Relaxed);
            let position_ms = if offset_enabled {
                position_ms_raw.saturating_add(offset_ms).max(0)
            } else {
                position_ms_raw
            };

            // 同步播放/暂停状态，暂停时只发暂停事件，不推进歌词。
            if is_playing != last_is_playing {
                last_is_playing = is_playing;
                logger::info(
                    "Lyrics",
                    &format!(
                        "playback state={} title='{}' artist='{}' genre='{}' position_raw_ms={} position_effective_ms={}",
                        if is_playing { "playing" } else { "paused" },
                        media_info.title,
                        media_info.artist,
                        media_info.genre,
                        position_ms_raw,
                        position_ms
                    ),
                );
                let _ = window.emit("music-page", is_playing);
            }

            is_music.store(true, Ordering::Relaxed);

            if !is_playing {
                if was_playing {
                    was_playing = false;
                    logger::info(
                        "Lyrics",
                        &format!(
                            "playback paused title='{}' artist='{}'",
                            media_info.title, media_info.artist
                        ),
                    );
                }
                continue;
            }

            // 识别切歌：当前用 artist + title 作为歌曲身份。
            let track_key = format!("{} - {}", media_info.artist, media_info.title);
            if track_key != current_track {
                logger::info(
                    "Lyrics",
                    &format!(
                        "\nsmtc: track changed title='{}' artist='{}' genre='{}' duration_ms={} position_ms={} is_playing={} offset_enabled={} offset_ms={}",
                        media_info.title,
                        media_info.artist,
                        media_info.genre,
                        media_info.duration_ms,
                        position_ms_raw,
                        is_playing,
                        offset_enabled,
                        offset_ms
                    ),
                );
                current_track = track_key.clone();
                media::dump_smtc_session("");
                last_lyric_text.clear();
                last_info_track.clear();
                current_lyrics.clear();
                lyrics_not_found = false;

                current_gen = lyrics_generation.fetch_add(1, Ordering::Relaxed) + 1;
                fetch_pending = false;

                logger::info(
                    "SMTC",
                    &format!(
                        "thumbnail for media-changed: {}",
                        thumbnail
                            .as_ref()
                            .map(|v| format!("{} bytes", v.len()))
                            .unwrap_or_else(|| "none".to_string())
                    ),
                );
                let _ = window.emit("music-page", true);
                let _ = window.emit(
                    "media-changed",
                    serde_json::json!({
                        "title": media_info.title,
                        "artist": media_info.artist,
                        "album_title": media_info.album_title,
                        "album_artist": media_info.album_artist,
                        "genre": media_info.genre,
                        "thumbnail": thumbnail,
                        "duration_ms": media_info.duration_ms,
                        "seekable": media_info.seekable
                    }),
                );

                // 歌词模式下异步拉取歌词；generation 用来防止旧歌词覆盖新歌。
                if mode == "lyric" {
                    let title = media_info.title.clone();
                    let artist = media_info.artist.clone();
                    let album_title = media_info.album_title.clone();
                    let album_artist = media_info.album_artist.clone();
                    let duration_ms = media_info.duration_ms;
                    let genre = media_info.genre.clone();
                    let gen = current_gen;
                    let result_ref = lyrics_result.clone();
                    let gen_ref = lyrics_generation.clone();
                    fetch_pending = true;
                    logger::info(
                        "Lyrics",
                        &format!(
                            "lyric fetch start gen={} title='{}' artist='{}' genre='{}' strategy=genre_ncmid",
                            gen, title, artist, genre
                        ),
                    );
                    let lyrix_l = lyrix.clone();
                    thread::Builder::new()
                        .name("lyric-fetch".into())
                        .stack_size(512 * 1024)
                        .spawn(move || {
                            if gen_ref.load(Ordering::Relaxed) != gen {
                                return;
                            }
                            let fetched_lyrics = lyrics::fetch_lyrics_from_lyrix(
                                &title,
                                &artist,
                                &album_title,
                                &album_artist,
                                &raw_app_id,
                                duration_ms,
                                &genre,
                                gen_ref.clone(),
                                gen,
                                lyrix_l,
                            );
                            if gen_ref.load(Ordering::Relaxed) == gen {
                                let not_found = fetched_lyrics.is_none();
                                let line_count = fetched_lyrics.as_ref().map(|v| v.len()).unwrap_or(0);
                                let mut guard = result_ref.lock().unwrap_or_else(|e| e.into_inner());
                                let already_found = guard
                                    .as_ref()
                                    .map(|(g, _, nf)| *g == gen && !nf)
                                    .unwrap_or(false);
                                if already_found && not_found {
                                    logger::warn(
                                        "Lyrics",
                                        &format!(
                                            "lyric fetch skip stale not_found gen={} (already have result)",
                                            gen
                                        ),
                                    );
                                } else {
                                    logger::info(
                                        "Lyrics",
                                        &format!(
                                            "lyric fetch done gen={} found={} lines={}",
                                            gen, !not_found, line_count
                                        ),
                                    );
                                    *guard = Some((gen, fetched_lyrics.unwrap_or_default(), not_found));
                                }
                            } else {
                                logger::warn(
                                    "Lyrics",
                                    &format!(
                                        "lyric fetch drop stale gen={} current_gen={}",
                                        gen,
                                        gen_ref.load(Ordering::Relaxed)
                                    ),
                                );
                            }
                        })
                        .ok();
                }
            }

            was_playing = true;

            // 推送歌词实时更新：只发歌词、进度和逐字/附近歌词等动态信息。
            if mode == "lyric" {
                let (text_val, nearby_json, line_tokens, line_start_ms, next_line_time_ms) =
                    if fetch_pending && current_lyrics.is_empty() {
                        (serde_json::json!("♪"), None, None, None, None)
                    } else if lyrics_not_found || (!fetch_pending && current_lyrics.is_empty()) {
                        (serde_json::json!(null), None, None, None, None)
                    } else if let Some(line_idx) = current_lyrics
                        .iter()
                        .rposition(|l| l.time_ms <= position_ms)
                    {
                        let line = &current_lyrics[line_idx];
                        let nearby = if line.text != last_lyric_text {
                            last_lyric_text = line.text.clone();
                            let nearby = lyrics::get_nearby_lyrics(&current_lyrics, position_ms);
                            Some(
                                nearby
                                    .iter()
                                    .map(|(text, is_current)| {
                                        serde_json::json!({
                                            "text": text,
                                            "is_current": is_current
                                        })
                                    })
                                    .collect::<Vec<_>>(),
                            )
                        } else {
                            None
                        };
                        let tokens = if line.tokens.is_empty() {
                            None
                        } else {
                            Some(line.tokens.clone())
                        };
                        let next_switch_ms = if line_idx + 1 < current_lyrics.len() {
                            current_lyrics[line_idx + 1].time_ms
                        } else {
                            line.end_time_ms
                        };
                        (
                            serde_json::json!(line.text),
                            nearby,
                            tokens,
                            Some(line.time_ms),
                            Some(next_switch_ms),
                        )
                    } else {
                        let nearby = lyrics::get_nearby_lyrics(&current_lyrics, position_ms);
                        let nearby_json = Some(
                            nearby
                                .iter()
                                .map(|(text, is_current)| {
                                    serde_json::json!({
                                        "text": text,
                                        "is_current": is_current
                                    })
                                })
                                .collect::<Vec<_>>(),
                        );
                        (serde_json::json!("♪"), nearby_json, None, None, None)
                    };

                let mut payload = serde_json::json!({
                    "text": text_val,
                    "position_ms": position_ms,
                    "is_playing": is_playing
                });
                if let Some(nearby) = nearby_json {
                    payload["nearby_lyrics"] = serde_json::json!(nearby);
                }
                if let Some(tokens) = line_tokens {
                    payload["tokens"] = serde_json::json!(tokens);
                }
                if let Some(v) = line_start_ms {
                    payload["line_start_ms"] = serde_json::json!(v);
                }
                if let Some(v) = next_line_time_ms {
                    payload["next_line_time_ms"] = serde_json::json!(v);
                }
                let _ = window.emit("lyric-update", payload);
            } else {
                let _ = window.emit("lyric-update", serde_json::json!({
                    "text": null,
                    "position_ms": position_ms,
                    "is_playing": is_playing
                }));
            }
        }
    });
}
