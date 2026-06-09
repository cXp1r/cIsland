//! Stream reader for scrcpy video/audio data
//!
//! Provides stream interface for reading packets from scrcpy server.

use super::error::Result;
use super::protocol::{Packet, ProtocolReader};
use crate::logger;

const TAG: &str = "sadb_core::stream";

/// Async stream of scrcpy packets (retained for future async use).
#[allow(dead_code)]
pub struct PacketStream<R> {
    reader: R,
    protocol_reader: ProtocolReader,
    buffer: Vec<u8>,
}

impl<R> PacketStream<R>
where
    R: tokio::io::AsyncRead + Unpin,
{
    /// Create new packet stream
    pub fn new(reader: R) -> Self {
        Self {
            reader,
            protocol_reader: ProtocolReader::new(),
            buffer: Vec::new(),
        }
    }

    /// Read raw data and try to parse packets
    #[allow(dead_code)]
    async fn read_and_parse(&mut self) -> Result<Option<Packet>> {
        use tokio::io::AsyncReadExt;

        // Read some data if buffer is empty
        if self.buffer.is_empty() {
            let mut temp_buf = [0u8; 8192];
            match self.reader.read(&mut temp_buf).await {
                Ok(0) => {
                    logger::debug(TAG, "Connection closed");
                    return Ok(None);
                }
                Ok(n) => {
                    self.buffer.extend_from_slice(&temp_buf[..n]);
                }
                Err(e) => return Err(e.into()),
            }
        }

        // Add buffer to protocol reader
        self.protocol_reader.extend(&self.buffer);
        self.buffer.clear();

        // Try to parse packet
        if let Some(result) = self.protocol_reader.try_parse_packet() {
            // Keep remaining data in buffer
            self.buffer.extend_from_slice(&self.protocol_reader.buffer);
            self.protocol_reader.clear();
            Some(result).transpose()
        } else {
            // No complete packet yet, keep remaining data
            self.buffer.extend_from_slice(&self.protocol_reader.buffer);
            self.protocol_reader.clear();
            Ok(None) // Need more data
        }
    }
}

/// Synchronous packet stream
pub struct SyncPacketStream<R>
where
    R: std::io::Read,
{
    reader: R,
    protocol_reader: ProtocolReader,
}

impl<R> SyncPacketStream<R>
where
    R: std::io::Read,
{
    /// Create new sync packet stream
    pub fn new(reader: R) -> Self {
        Self {
            reader,
            protocol_reader: ProtocolReader::new(),
        }
    }

    /// Read the next complete packet. Blocks until a full packet is available,
    /// or returns `Err(ConnectionClosed)` on EOF.
    ///
    /// Returns `Ok(None)` only if a spurious zero-byte read occurs before any
    /// data is buffered (practically never).
    pub fn read_packet(&mut self) -> Result<Option<Packet>> {
        use super::error::Error;
        let mut temp_buf = [0u8; 16 * 1024];

        loop {
            // First try to parse with existing buffered data.
            if let Some(result) = self.protocol_reader.try_parse_packet() {
                return result.map(Some);
            }

            // Need more bytes.
            match self.reader.read(&mut temp_buf) {
                Ok(0) => {
                    logger::debug(TAG, "Connection closed (EOF)");
                    return Err(Error::ConnectionClosed);
                }
                Ok(n) => {
                    self.protocol_reader.extend(&temp_buf[..n]);
                    // loop: try to parse again
                }
                Err(e) => return Err(e.into()),
            }
        }
    }
}

/// Utility to write packets to file
pub struct PacketWriter<W>
where
    W: std::io::Write,
{
    writer: W,
}

impl<W> PacketWriter<W>
where
    W: std::io::Write,
{
    /// Create new packet writer
    pub fn new(writer: W) -> Self {
        Self { writer }
    }

    /// Write packet data (H.264 raw stream)
    pub fn write_packet(&mut self, packet: &Packet) -> Result<()> {
        self.writer.write_all(&packet.data)?;
        Ok(())
    }

    /// Flush writer
    pub fn flush(&mut self) -> Result<()> {
        self.writer.flush()?;
        Ok(())
    }
}
