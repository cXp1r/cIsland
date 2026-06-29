//! Scrcpy protocol implementation (v4.0)
//!
//! Handles the binary protocol between client and server:
//! - Device metadata on first socket (64-byte UTF-8 name, sent once)
//! - Per-stream header:
//!     * video: 4 bytes codec id, then a 12-byte SESSION packet (flags+w+h)
//!     * audio: 4 bytes codec id (0 = stream disabled by device)
//! - Frame packets: 12-byte meta (8 bytes pts+flags, 4 bytes size) + payload
//! - Session packets (video stream only, may appear at any time on resize):
//!   12 bytes total, bit 63 set in the first 8-byte word, no payload.
//!
//! Flag layout (top 3 bits of the 8-byte pts+flags word):
//!   bit 63 = SESSION   (0x8000_0000 in the high u32)
//!   bit 62 = CONFIG    (0x4000_0000 in the high u32)
//!   bit 61 = KEY_FRAME (0x2000_0000 in the high u32)
//!   bits 60..0 = PTS

use super::error::{Error, Result};
use crate::logger;
use bytes::{Bytes, BytesMut};

const TAG: &str = "sadb_core::protocol";

/// FourCC helper: pack ASCII bytes into a big-endian u32.
const fn fourcc(s: &[u8; 4]) -> u32 {
    ((s[0] as u32) << 24) | ((s[1] as u32) << 16) | ((s[2] as u32) << 8) | (s[3] as u32)
}

/// Video codec IDs. Values match the 4CC codes emitted by scrcpy-server:
/// `'h264'`, `'h265'`, `'av01'`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum VideoCodec {
    H264 = fourcc(b"h264"),
    H265 = fourcc(b"h265"),
    AV1 = fourcc(b"av01"),
}

impl TryFrom<u32> for VideoCodec {
    type Error = Error;

    fn try_from(value: u32) -> Result<Self> {
        const H264: u32 = fourcc(b"h264");
        const H265: u32 = fourcc(b"h265");
        const AV1: u32 = fourcc(b"av01");
        match value {
            H264 => Ok(VideoCodec::H264),
            H265 => Ok(VideoCodec::H265),
            AV1 => Ok(VideoCodec::AV1),
            _ => Err(Error::Protocol(format!(
                "Unknown video codec: 0x{:08x} ('{}')",
                value,
                fourcc_to_string(value)
            ))),
        }
    }
}

/// Audio codec IDs. Values match the 4CC codes emitted by scrcpy-server:
/// `'opus'`, `'aac '`, `'flac'`, `'raw '`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum AudioCodec {
    OPUS = fourcc(b"opus"),
    AAC = fourcc(b"aac "),
    FLAC = fourcc(b"flac"),
    RAW = fourcc(b"raw "),
}

impl TryFrom<u32> for AudioCodec {
    type Error = Error;

    fn try_from(value: u32) -> Result<Self> {
        const OPUS: u32 = fourcc(b"opus");
        const AAC: u32 = fourcc(b"aac ");
        const FLAC: u32 = fourcc(b"flac");
        const RAW: u32 = fourcc(b"raw ");
        match value {
            OPUS => Ok(AudioCodec::OPUS),
            AAC => Ok(AudioCodec::AAC),
            FLAC => Ok(AudioCodec::FLAC),
            RAW => Ok(AudioCodec::RAW),
            _ => Err(Error::Protocol(format!(
                "Unknown audio codec: 0x{:08x} ('{}')",
                value,
                fourcc_to_string(value)
            ))),
        }
    }
}

/// Render a u32 4CC back to an ASCII-ish string for error messages.
fn fourcc_to_string(v: u32) -> String {
    let bytes = v.to_be_bytes();
    bytes
        .iter()
        .map(|&b| {
            if b.is_ascii_graphic() || b == b' ' {
                b as char
            } else {
                '.'
            }
        })
        .collect()
}

/// Device metadata sent on first socket
#[derive(Debug, Clone)]
pub struct DeviceMetadata {
    /// Device name
    pub name: String,
}

/// Video codec metadata.
///
/// In v4.0 the codec id (4 bytes) is the only header on the video socket;
/// width/height arrive shortly after as a [`SessionMeta`] packet.
#[derive(Debug, Clone)]
pub struct VideoCodecMetadata {
    /// Video codec
    pub codec: VideoCodec,
    /// Initial width (filled in once the first session-meta packet is read)
    pub width: u32,
    /// Initial height
    pub height: u32,
}

/// 12-byte session metadata packet emitted by the server (video stream).
/// Carries the current video size; sent once after the codec id, and again
/// whenever the encoder resets (e.g. on display rotation/resize).
#[derive(Debug, Clone, Copy)]
pub struct SessionMeta {
    pub width: u32,
    pub height: u32,
    /// Set if the resize was triggered by a client request.
    pub client_resized: bool,
}

/// Audio codec metadata
#[derive(Debug, Clone)]
pub struct AudioCodecMetadata {
    /// Audio codec
    pub codec: AudioCodec,
}

/// Frame header (12 bytes)
#[derive(Debug, Clone)]
pub struct FrameHeader {
    /// Is this a config packet?
    pub config_packet: bool,
    /// Is this a key frame?
    pub key_frame: bool,
    /// Presentation timestamp (62 bits)
    pub pts: u64,
    /// Packet data size
    pub size: u32,
}

/// Video/Audio packet
#[derive(Debug, Clone)]
pub struct Packet {
    /// Frame header
    pub header: FrameHeader,
    /// Packet data
    pub data: Bytes,
}

impl DeviceMetadata {
    /// Parse device metadata from bytes
    pub fn parse(data: &[u8]) -> Result<Self> {
        let name = String::from_utf8(data.to_vec())?;
        logger::debug(TAG, &format!("Device name: {}", name));
        Ok(Self { name })
    }

    /// Serialize to bytes
    pub fn serialize(&self) -> Vec<u8> {
        self.name.as_bytes().to_vec()
    }
}

impl VideoCodecMetadata {
    /// Parse the 4-byte codec id portion of the video header (v4.0).
    /// Width/height must be filled in by the caller from the subsequent
    /// [`SessionMeta`] packet.
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < 4 {
            return Err(Error::Protocol("Video codec id too short".to_string()));
        }
        let codec_id = u32::from_be_bytes(data[0..4].try_into().unwrap());
        let codec = VideoCodec::try_from(codec_id)?;
        logger::debug(TAG, &format!("Video codec: {:?}", codec));
        Ok(Self {
            codec,
            width: 0,
            height: 0,
        })
    }

    /// Serialize to 4 bytes (codec id only, v4.0 wire format).
    pub fn serialize(&self) -> [u8; 4] {
        (self.codec as u32).to_be_bytes()
    }
}

impl SessionMeta {
    /// Parse a 12-byte session-meta packet. The high bit of the first u32
    /// (the SESSION flag) MUST be set; the caller checks this with
    /// [`is_session_header`] before calling.
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < 12 {
            return Err(Error::Protocol("Session meta too short".to_string()));
        }
        let flags = u32::from_be_bytes(data[0..4].try_into().unwrap());
        if (flags & 0x8000_0000) == 0 {
            return Err(Error::Protocol(
                "Expected session-meta packet (high bit not set)".to_string(),
            ));
        }
        let width = u32::from_be_bytes(data[4..8].try_into().unwrap());
        let height = u32::from_be_bytes(data[8..12].try_into().unwrap());
        let client_resized = (flags & 1) != 0;
        logger::debug(
            TAG,
            &format!(
                "Session meta: {}x{} (client_resized={})",
                width, height, client_resized
            ),
        );
        Ok(Self {
            width,
            height,
            client_resized,
        })
    }
}

/// True if the 12-byte packet header at `data[..12]` is a session-meta packet
/// (i.e. has the SESSION flag set). The caller must have at least 12 bytes
/// available; in practice this is checked by [`ProtocolReader::try_parse_packet`].
#[inline]
pub fn is_session_header(data: &[u8]) -> bool {
    !data.is_empty() && (data[0] & 0x80) != 0
}

impl AudioCodecMetadata {
    /// Parse from 4 bytes
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < 4 {
            return Err(Error::Protocol(
                "Audio codec metadata too short".to_string(),
            ));
        }

        let codec_id = u32::from_be_bytes(data[0..4].try_into().unwrap());
        let codec = AudioCodec::try_from(codec_id)?;

        logger::debug(TAG, &format!("Audio codec: {:?}", codec));

        Ok(Self { codec })
    }

    /// Serialize to 4 bytes
    pub fn serialize(&self) -> [u8; 4] {
        (self.codec as u32).to_be_bytes()
    }
}

impl FrameHeader {
    /// Parse from 12 bytes (v4.0 layout). Caller must have already verified
    /// this is NOT a session header via [`is_session_header`].
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < 12 {
            return Err(Error::Protocol("Frame header too short".to_string()));
        }

        // Read first 8 bytes (PTS + flags), big-endian
        let pts_high = u32::from_be_bytes(data[0..4].try_into().unwrap());
        let pts_low = u32::from_be_bytes(data[4..8].try_into().unwrap());

        // Extract flags from most significant bits (v4.0 layout)
        //   bit 63 = SESSION   — handled by caller, MUST be 0 here
        //   bit 62 = CONFIG
        //   bit 61 = KEY_FRAME
        let config_packet = (pts_high & 0x4000_0000) != 0;
        let key_frame = (pts_high & 0x2000_0000) != 0;

        // Reconstruct 61-bit PTS
        let pts = ((pts_high & 0x1fff_ffff) as u64) << 32 | pts_low as u64;

        // Packet size is big-endian u32
        let size = u32::from_be_bytes(data[8..12].try_into().unwrap());

        Ok(Self {
            config_packet,
            key_frame,
            pts,
            size,
        })
    }

    /// Serialize to 12 bytes (v4.0 layout)
    pub fn serialize(&self) -> [u8; 12] {
        let mut buf = [0u8; 12];

        let pts_high: u32 = (((self.pts >> 32) & 0x1fff_ffff) as u32)
            | (if self.key_frame { 0x2000_0000 } else { 0 })
            | (if self.config_packet { 0x4000_0000 } else { 0 });
        let pts_low = (self.pts & 0xffff_ffff) as u32;

        buf[0..4].copy_from_slice(&pts_high.to_be_bytes());
        buf[4..8].copy_from_slice(&pts_low.to_be_bytes());
        buf[8..12].copy_from_slice(&self.size.to_be_bytes());

        buf
    }
}

impl Packet {
    /// Parse packet from header and data
    pub fn new(header: FrameHeader, data: Bytes) -> Self {
        Self { header, data }
    }

    /// Check if this is a config packet (SPS/PPS for H.264)
    pub fn is_config(&self) -> bool {
        self.header.config_packet
    }

    /// Check if this is a key frame
    pub fn is_key_frame(&self) -> bool {
        self.header.key_frame
    }

    /// Get packet size
    pub fn size(&self) -> usize {
        self.data.len()
    }
}

/// Protocol reader for parsing incoming data stream
pub struct ProtocolReader {
    pub(crate) buffer: BytesMut,
    pub(crate) last_session: Option<SessionMeta>,
}

impl ProtocolReader {
    pub fn new() -> Self {
        Self {
            buffer: BytesMut::new(),
            last_session: None,
        }
    }

    /// Add data to buffer
    pub fn extend(&mut self, data: &[u8]) {
        self.buffer.extend_from_slice(data);
    }

    /// Try to parse device metadata
    pub fn try_parse_device_metadata(&mut self) -> Option<Result<DeviceMetadata>> {
        // Device metadata is null-terminated string
        if let Some(pos) = self.buffer.iter().position(|&b| b == 0) {
            let data = self.buffer.split_to(pos + 1);
            let data = &data[..pos]; // Remove null terminator
            Some(DeviceMetadata::parse(data))
        } else {
            None
        }
    }

    /// Try to parse video codec id (4 bytes, v4.0)
    pub fn try_parse_video_codec_metadata(&mut self) -> Option<Result<VideoCodecMetadata>> {
        if self.buffer.len() >= 4 {
            let data = self.buffer.split_to(4);
            Some(VideoCodecMetadata::parse(&data))
        } else {
            None
        }
    }

    /// Try to parse audio codec metadata (4 bytes)
    pub fn try_parse_audio_codec_metadata(&mut self) -> Option<Result<AudioCodecMetadata>> {
        if self.buffer.len() >= 4 {
            let data = self.buffer.split_to(4);
            Some(AudioCodecMetadata::parse(&data))
        } else {
            None
        }
    }

    /// Try to parse next packet (v4.0).
    ///
    /// In v4.0 the video stream interleaves session-meta packets (12 bytes,
    /// no payload) with frame packets (12-byte header + payload). Session
    /// packets are silently absorbed here — the device size is propagated
    /// out of band via [`take_session_meta`].
    pub fn try_parse_packet(&mut self) -> Option<Result<Packet>> {
        loop {
            if self.buffer.len() < 12 {
                return None;
            }

            if is_session_header(&self.buffer[..12]) {
                let session_result = SessionMeta::parse(&self.buffer[..12]);
                let _ = self.buffer.split_to(12);
                match session_result {
                    Ok(s) => {
                        self.last_session = Some(s);
                        // try again for an actual frame
                        continue;
                    }
                    Err(e) => return Some(Err(e)),
                }
            }

            let header = match FrameHeader::parse(&self.buffer[..12]) {
                Ok(h) => h,
                Err(e) => return Some(Err(e)),
            };

            let required_size = 12 + header.size as usize;
            if self.buffer.len() < required_size {
                return None; // Need more data
            }

            let _header_bytes = self.buffer.split_to(12);
            let data = self.buffer.split_to(header.size as usize);
            return Some(Ok(Packet::new(header, data.freeze())));
        }
    }

    /// Take and clear the most recently observed session-meta info (if any).
    /// Useful for callers that want to react to device-side resize events.
    pub fn take_session_meta(&mut self) -> Option<SessionMeta> {
        self.last_session.take()
    }

    /// Get remaining buffer length
    pub fn remaining(&self) -> usize {
        self.buffer.len()
    }

    /// Clear buffer
    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

impl Default for ProtocolReader {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_codec_metadata_v4() {
        let metadata = VideoCodecMetadata {
            codec: VideoCodec::H264,
            width: 0,
            height: 0,
        };
        let data = metadata.serialize();
        assert_eq!(data.len(), 4);
        let parsed = VideoCodecMetadata::parse(&data).unwrap();
        assert_eq!(parsed.codec, VideoCodec::H264);
    }

    #[test]
    fn test_session_meta() {
        // flags=0x80000001 (session+resize), w=1920, h=1080
        let mut buf = [0u8; 12];
        buf[0..4].copy_from_slice(&0x8000_0001u32.to_be_bytes());
        buf[4..8].copy_from_slice(&1920u32.to_be_bytes());
        buf[8..12].copy_from_slice(&1080u32.to_be_bytes());
        assert!(is_session_header(&buf));
        let meta = SessionMeta::parse(&buf).unwrap();
        assert_eq!(meta.width, 1920);
        assert_eq!(meta.height, 1080);
        assert!(meta.client_resized);
    }

    #[test]
    fn test_frame_header() {
        let header = FrameHeader {
            config_packet: false,
            key_frame: true,
            pts: 0x123456789ABCDEF0,
            size: 1024,
        };

        let data = header.serialize();
        let parsed = FrameHeader::parse(&data).unwrap();

        assert_eq!(parsed.config_packet, false);
        assert_eq!(parsed.key_frame, true);
        assert_eq!(parsed.pts, 0x123456789ABCDEF0);
        assert_eq!(parsed.size, 1024);
    }

    #[test]
    fn test_protocol_reader_session_then_frame() {
        let mut reader = ProtocolReader::new();

        // Session meta (12 bytes, no payload)
        let mut session = [0u8; 12];
        session[0..4].copy_from_slice(&0x8000_0000u32.to_be_bytes());
        session[4..8].copy_from_slice(&1920u32.to_be_bytes());
        session[8..12].copy_from_slice(&1080u32.to_be_bytes());
        reader.extend(&session);

        // A real frame: pts=1234, key, size=3, payload=[0xaa,0xbb,0xcc]
        let frame_header = FrameHeader {
            config_packet: false,
            key_frame: true,
            pts: 1234,
            size: 3,
        };
        reader.extend(&frame_header.serialize());
        reader.extend(&[0xaa, 0xbb, 0xcc]);

        let pkt = reader.try_parse_packet().unwrap().unwrap();
        assert_eq!(pkt.header.size, 3);
        assert!(pkt.header.key_frame);
        assert_eq!(&pkt.data[..], &[0xaa, 0xbb, 0xcc]);
        let s = reader.take_session_meta().unwrap();
        assert_eq!(s.width, 1920);
        assert_eq!(s.height, 1080);
    }
}
