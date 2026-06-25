pub(crate) mod lyrics;
pub(crate) mod media;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use lyrix::smtc_lyrics::Lyrix;
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
    let thumb_generation = Arc::new(AtomicU64::new(0));

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

            let mode = lyric_mode.lock().unwrap().clone();
            if mode == "off" {
                logger::warn("Lyrics", "music monitor stopped: lyric_mode is off");
                is_music.store(false, Ordering::Relaxed);
                let _ = window.emit("lyric-update", serde_json::json!(null));
                return;
            }

            let info = media::get_smtc_media_info();
            let (status, media_info, position_ms_raw, is_playing, raw_app_id) = match info {
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
                }
                continue;
            }

            let app_id = settings::normalize_app_id(&raw_app_id);

            {
                let mut active = active_player_app_id.lock().unwrap();
                let changed = active.as_deref() != Some(app_id.as_str());
                if changed {
                    *active = Some(app_id.clone());
                    drop(active);
                    let _ = app_handle.emit(
                        "lyric-offset-active-player-changed",
                        serde_json::json!({ "app_id": app_id }),
                    );
                }
            }

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
                    let _ = app_handle.emit(
                        "lyric-offset-players-changed",
                        serde_json::json!({ "new_app_id": app_id }),
                    );
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
                let _ = window.emit("playback-state", is_playing);
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
                    let _ = window.emit(
                        "media-paused",
                        serde_json::json!({
                            "title": media_info.title,
                            "artist": media_info.artist
                        }),
                    );
                }
                continue;
            }

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

                let _ = window.emit(
                    "media-changed",
                    serde_json::json!({
                        "title": media_info.title,
                        "artist": media_info.artist,
                        "genre": media_info.genre,
                        "thumbnail": null,
                        "duration_ms": media_info.duration_ms,
                        "seekable": media_info.seekable
                    }),
                );

                {
                    let win_thumb = window.clone();
                    let thumb_gen_val = thumb_generation.fetch_add(1, Ordering::Relaxed) + 1;
                    let thumb_gen_ref = thumb_generation.clone();
                    thread::Builder::new()
                        .name("thumb-fetch".into())
                        .spawn(move || {
                            let delays = [150u64, 400, 800];
                            for &delay_ms in delays.iter() {
                                thread::sleep(Duration::from_millis(delay_ms));
                                if thumb_gen_ref.load(Ordering::Relaxed) != thumb_gen_val {
                                    return;
                                }
                                if let Some(thumb) = media::get_smtc_thumbnail() {
                                    if thumb_gen_ref.load(Ordering::Relaxed) == thumb_gen_val {
                                        let _ = win_thumb.emit(
                                            "media-thumbnail",
                                            serde_json::json!({ "thumbnail": thumb }),
                                        );
                                    }
                                    return;
                                }
                            }
                        })
                        .ok();
                }

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

            let effective_duration_ms = if media_info.duration_ms > 0 {
                media_info.duration_ms
            } else if let Some(last) = current_lyrics.last() {
                last.time_ms + 5000
            } else {
                0
            };

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
                    "title": media_info.title,
                    "artist": media_info.artist,
                    "genre": media_info.genre,
                    "position_ms": position_ms,
                    "duration_ms": effective_duration_ms,
                    "is_playing": is_playing,
                    "seekable": media_info.seekable
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
                let _ = window.emit(
                    "lyric-update",
                    serde_json::json!({
                        "text": null,
                        "title": media_info.title,
                        "artist": media_info.artist,
                        "genre": media_info.genre,
                        "position_ms": position_ms,
                        "duration_ms": effective_duration_ms,
                        "is_playing": is_playing,
                        "seekable": media_info.seekable
                    }),
                );
            }
        }
    });
}
