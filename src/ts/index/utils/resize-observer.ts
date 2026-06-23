
import { invoke } from "@tauri-apps/api/core";
import { capsule } from "../doms/dom";
import { setLyricMode } from "../state";

export function initResizeObserver() {
  let timer: number | null = null;
  const syncCapsuleRect = () => {
    const width = capsule.offsetWidth || 0;
    const height = capsule.offsetHeight || 0;
    void invoke('set_capsule_current_rect', { height, width });
  };
  const bodyObserver = new ResizeObserver(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    syncCapsuleRect();
    timer = window.setTimeout(() => {
      
    }, 1);
  });
  if (capsule) {
    bodyObserver.observe(capsule);
  }


  invoke<{ lyric_mode: string; indicator_color: string; agent_window_size: string }>("get_settings").then((s) => {
    setLyricMode(s.lyric_mode || "lyric");
  });
}
