pub(crate) fn extract_urls(text: &str) -> Vec<String> {
    let mut urls = Vec::new();
    for word in text.split(|c: char| {
        c.is_whitespace()
            || c == '"'
            || c == '\''
            || c == '<'
            || c == '>'
            || c == '('
            || c == ')'
            || c == '['
            || c == ']'
            || c == '{'
            || c == '}'
            || c == '|'
    }) {
        let w =
            word.trim_matches(|c: char| c == ',' || c == '.' || c == ';' || c == '!' || c == '?');
        if (w.starts_with("http://") || w.starts_with("https://")) && w.len() > 10 {
            if let Ok(parsed) = url::Url::parse(w) {
                if parsed.host().is_some() {
                    urls.push(w.to_string());
                }
            }
        }
    }
    urls.dedup();
    urls
}

pub(crate) fn read_clipboard_text() -> Option<String> {
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::DataExchange::{
        CloseClipboard, GetClipboardData, IsClipboardFormatAvailable, OpenClipboard,
    };
    use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};
    unsafe {
        if IsClipboardFormatAvailable(13).is_err() {
            return None;
        } // CF_UNICODETEXT = 13
        if OpenClipboard(None).is_err() {
            return None;
        }
        let h = GetClipboardData(13); // CF_UNICODETEXT
        let result = if let Ok(h) = h {
            let ptr = GlobalLock(HGLOBAL(h.0));
            if ptr.is_null() {
                None
            } else {
                let wide_ptr = ptr as *const u16;
                let mut len = 0;
                while *wide_ptr.add(len) != 0 {
                    len += 1;
                }
                let slice = std::slice::from_raw_parts(wide_ptr, len);
                let text = String::from_utf16_lossy(slice);
                GlobalUnlock(HGLOBAL(h.0)).ok();
                Some(text.trim().to_string())
            }
        } else {
            None
        };
        CloseClipboard().ok();
        result
    }
}

pub(crate) fn write_clipboard_text(text: &str) -> Result<(), String> {
    use windows::Win32::Foundation::{GlobalFree, HANDLE};
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    let mut utf16: Vec<u16> = text.encode_utf16().collect();
    utf16.push(0);

    unsafe {
        let memory = GlobalAlloc(GMEM_MOVEABLE, std::mem::size_of_val(utf16.as_slice()))
            .map_err(|e| format!("allocate clipboard memory failed: {}", e))?;
        let ptr = GlobalLock(memory) as *mut u16;
        if ptr.is_null() {
            let _ = GlobalFree(Some(memory));
            return Err("lock clipboard memory failed".to_string());
        }
        std::ptr::copy_nonoverlapping(utf16.as_ptr(), ptr, utf16.len());
        let _ = GlobalUnlock(memory);

        if let Err(e) = OpenClipboard(None) {
            let _ = GlobalFree(Some(memory));
            return Err(format!("open clipboard failed: {}", e));
        }
        let result = (|| {
            EmptyClipboard().map_err(|e| format!("empty clipboard failed: {}", e))?;
            SetClipboardData(13, Some(HANDLE(memory.0)))
                .map_err(|e| format!("set clipboard data failed: {}", e))?;
            Ok(())
        })();
        CloseClipboard().ok();
        if result.is_err() {
            let _ = GlobalFree(Some(memory));
        }
        result
    }
}
