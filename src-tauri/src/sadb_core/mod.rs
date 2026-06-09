//! sadb-core: Scrcpy-like Android screen mirroring protocol implementation in Rust
//!
//! This library provides:
//! - ADB client wrapper (push/reverse/shell)
//! - Scrcpy protocol parsing (device meta + codec meta + 12-byte frame headers)
//! - Server lifecycle management
//! - Video stream reader returning H.264 packets

pub mod adb;
pub mod client;
pub mod config;
pub mod control;
pub mod error;
pub mod protocol;
pub mod stream;

pub use client::ScrcpyClient;
pub use config::Config;
pub use control::{CopyKey, DeviceMessage, GetClipboard};
pub use error::{Error, Result};
