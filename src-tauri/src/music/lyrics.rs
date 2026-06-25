use lyrix::models::{LineInfo, LyricsData, TextInfo};
use lyrix::smtc_lyrics::{self, Lyrix};
use std::sync::Arc;

#[derive(Clone, Debug, serde::Serialize)]
pub(crate) struct LyricToken {
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
}

#[derive(Clone, Debug)]
pub(crate) struct LyricLine {
    pub time_ms: i64,
    pub end_time_ms: i64,
    pub text: String,
    pub tokens: Vec<LyricToken>,
}

pub(crate) fn fetch_lyrics_from_lyrix(
    title: &str,
    artist: &str,
    album_title: &str,
    album_artist: &str,
    app_id: &str,
    duration_ms: i64,
    genre: &str,
    gen_ref: std::sync::Arc<std::sync::atomic::AtomicU64>,
    gen: u64,
    lyrix: Arc<Lyrix>,
) -> Option<Vec<LyricLine>> {
    crate::logger::info("Lyrics", &format!(
        "\nlyric-fetch: song='{}' artist='{}' album='{}' album_artist='{}' duration_ms={} genre='{}'",
        title, artist, album_title, album_artist, duration_ms, genre
    ));
    crate::logger::info(
        "Lyrics",
        &format!("rust-api: enabled, title='{}' artist='{}'", title, artist),
    );
    let rt = match tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
    {
        Ok(rt) => rt,
        Err(e) => {
            crate::logger::warn(
                "Lyrics",
                &format!("\nrust-api: tokio runtime init failed: {}", e),
            );
            return None;
        }
    };

    let artist_opt = if artist.trim().is_empty() {
        None
    } else {
        Some(artist)
    };
    let album_opt: Option<&str> = if album_title.trim().is_empty() {
        None
    } else {
        Some(album_title)
    };
    let album_artist_opt: Option<&str> = if album_artist.trim().is_empty() {
        None
    } else {
        Some(album_artist)
    };
    let duration_ms_u32: u32 = duration_ms.clamp(0, i64::from(u32::MAX)) as u32;
    let data = rt.block_on(async {
        crate::logger::info(
            "Lyrics",
            &format!(
                "\nrust-api: title='{}' artist='{}' album artist='{}' duration_ms={}",
                title, artist, album_artist, duration_ms
            ),
        );
        if gen_ref.load(std::sync::atomic::Ordering::Relaxed) != gen {
            crate::logger::warn("Lyrics", &format!("rust-api: abort gen={} (stale)", gen));
            return None;
        }
        let player =
            lyrix::smtc_lyrics::id2player(app_id).unwrap_or(smtc_lyrics::MusicPlayer::Netease);
        lyrix::logger::set_level("debug");
        match lyrix
            .get_lyrics_with_player(
                &player,
                title,
                artist_opt,
                album_opt,
                album_artist_opt,
                duration_ms_u32,
            )
            .await
        {
            Ok(data) => {
                let ddata = if let Some(meta) = &data.track_metadata {
                    match meta.is_trial {
                        true => match lyrix.get_trial_part(data.clone()) {
                            Ok(l) => l,
                            Err(_e) => {
                                crate::logger::info(
                                    "Lyrics",
                                    "rust-api: failed to get trial part, return raw_lyrics",
                                );
                                data
                            }
                        },
                        _ => data,
                    }
                } else {
                    data
                };
                crate::logger::info(
                    "Lyrics",
                    &format!(
                        "rust-api: raw from='{}' lines={} file={:?} meta={:?}",
                        player.display_name(),
                        ddata.lines.len(),
                        ddata
                            .file
                            .as_ref()
                            .map(|f| format!("{:?}/{:?}", f.lyrics_type, f.sync_type)),
                        ddata.track_metadata,
                    ),
                );
                return Some(ddata);
            }
            Err(e) => {
                crate::logger::warn(
                    "Lyrics",
                    &format!(
                        "rust-api: fallback player='{}' failed: {}",
                        player.display_name(),
                        e
                    ),
                );
            }
        }

        crate::logger::warn("Lyrics", "rust-api: all sources exhausted");
        None
    });
    if let Some(data) = data {
        return Some(lyrics_data_to_lyric_lines(data));
    }
    crate::logger::warn("Lyrics", "rust-api: failed, Nothing to return");
    None
}

fn tokens_from_syllables(
    syllables: Vec<TextInfo>,
    line_start_ms: i64,
    line_end_ms: i64,
) -> Vec<LyricToken> {
    if syllables.is_empty() {
        return Vec::new();
    }

    let next_starts: Vec<Option<i64>> = syllables
        .iter()
        .enumerate()
        .map(|(i, _s)| {
            if i + 1 < syllables.len() {
                Some(line_start_ms + i64::from(syllables[i + 1].start_time))
            } else {
                None
            }
        })
        .collect();

    let mut tokens = Vec::with_capacity(syllables.len());
    for (i, s) in syllables.into_iter().enumerate() {
        if s.text.is_empty() {
            continue;
        }
        let start = line_start_ms + i64::from(s.start_time);
        let mut end = if s.duration > 0 {
            start + i64::from(s.duration)
        } else if let Some(next_start) = next_starts[i] {
            next_start
        } else {
            line_end_ms
        };
        if end < start {
            end = start;
        }
        if end > line_end_ms {
            end = line_end_ms;
        }
        tokens.push(LyricToken {
            text: s.text,
            start_ms: start,
            end_ms: end,
        });
    }
    if !tokens.is_empty() {
        return tokens;
    }
    Vec::new()
}

fn lyrics_data_to_lyric_lines(data: LyricsData) -> Vec<LyricLine> {
    let mut items: Vec<LineInfo> = data
        .lines
        .into_iter()
        .filter(|l| {
            !l.text.trim().is_empty() || l.syllables.iter().any(|s| !s.text.trim().is_empty())
        })
        .collect();
    items.sort_by_key(|l| l.start_time);

    let n = items.len();

    let end_times: Vec<i64> = items
        .iter()
        .enumerate()
        .map(|(pos, line)| {
            let start = i64::from(line.start_time);
            if line.duration > 0 {
                start + i64::from(line.duration)
            } else if pos + 1 < n {
                i64::from(items[pos + 1].start_time)
            } else {
                start + 4000
            }
        })
        .collect();

    let mut out = Vec::with_capacity(n);
    for (pos, line) in items.into_iter().enumerate() {
        let lyrix::models::LineInfo {
            start_time,
            text,
            syllables,
            ..
        } = line;
        let start_ms = i64::from(start_time);
        let end_ms = end_times[pos];
        let display_text = if text.trim().is_empty() {
            syllables
                .iter()
                .map(|s| s.text.as_str())
                .collect::<String>()
        } else {
            text
        };
        out.push(LyricLine {
            time_ms: start_ms,
            end_time_ms: end_ms,
            text: display_text,
            tokens: tokens_from_syllables(syllables, start_ms, end_ms), // syllables moved
        });
    }
    out
}

/// 获取当前播放位置周围的歌词行（前2行、当前行、后2行）
pub(crate) fn get_nearby_lyrics(lyrics: &[LyricLine], position_ms: i64) -> Vec<(String, bool)> {
    if lyrics.is_empty() {
        return Vec::new();
    }

    // Find current line index
    let mut current_idx: Option<usize> = None;
    for (i, line) in lyrics.iter().enumerate() {
        if line.time_ms <= position_ms {
            current_idx = Some(i);
        } else {
            break;
        }
    }

    let current_idx = match current_idx {
        Some(i) => i,
        None => {
            // Before first lyric line (intro/prelude): show first 5 lines as preview
            return lyrics
                .iter()
                .take(5)
                .map(|line| (line.text.clone(), false))
                .collect();
        }
    };

    let start = current_idx.saturating_sub(2);
    let end = (current_idx + 3).min(lyrics.len());
    let result = (start..end)
        .map(|i| (lyrics[i].text.clone(), i == current_idx))
        .collect();
    result
}
