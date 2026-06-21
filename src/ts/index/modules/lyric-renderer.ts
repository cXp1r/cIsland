import { listen } from "@tauri-apps/api/event";
import {
  lyricText, lyricTextInner, lyricMeta,
  mpLyricText,
  progressFill, progressThumb,
  mpProgressFill, mpProgressThumb,
  mpTimeCurrent, mpTimeTotal,
} from "../dom";
import {
  isMusicPlaying, setIsMusicPlaying,
  isPlaying, setIsPlaying,
  lyricMode, setLyricMode,
  setCurrentDurationMs,
  isSeeking,
  isMpSeeking,
  userChosenView, setUserChosenView,
  tokenSpans, setTokenSpans,
  currentLyricTokenKey, setCurrentLyricTokenKey,
  activeLyricTokens, setActiveLyricTokens,
  activeLyricBasePositionMs, setActiveLyricBasePositionMs,
  activeLyricBasePerfMs, setActiveLyricBasePerfMs,
  lyricScrollLineStartMs, setLyricScrollLineStartMs,
  lyricScrollNextLineTimeMs, setLyricScrollNextLineTimeMs,
  lyricScrollLastX, setLyricScrollLastX,
  mpCurrentLyricInner, setMpCurrentLyricInner,
  mpCurrentLyricOuter, setMpCurrentLyricOuter,
  mpTokenSpans, setMpTokenSpans,
  currentMpLyricTokenKey, setCurrentMpLyricTokenKey,
  lyricFpsWindowStartMs, setLyricFpsWindowStartMs,
  lyricFpsFrameCount, setLyricFpsFrameCount,
  tokenAnimationId, setTokenAnimationId,
  prevLineMap, setPrevLineMap,
} from "../state";
import { formatTime } from "../utils";
import { setView, updateSwitcherUI, updatePlayIcon } from "./view-switcher";
import { updateSeekable } from "./music-controls";
import { logd } from "../logger";
import { PageState } from "../state-machines/page";
import { pageStateMachine } from "../state-machines/page-machine";

const TAG: string = "Lyrics"

/**
 * 闂佹眹鍨婚崰鎰板�?token 闂佸憡甯楅〃澶愬Υ閸愵喗鍎嶉柛鏇ㄥ帎閺冨倵鍋撶憴鍕暡闁绘牭绲块幏鐘诲幢椤撶姷顦梺娲绘娇閸斿鑺遍鍕闁靛牆妫欓�?DOM 闂佸搫瀚烽崹浼村箚娓氣偓濡線鍩€椤掑倹鍟哄〒姘ｅ亾闁革絿顭堥娆撳箒閹哄棗�?
 * @param tokens token 闁瑰吋娼欑换鎰板垂椤忓牊鏅柛顐ｇ箖閸庢捇鏌￠崒姘婵犫偓閻楀牏鈻旈幖娣€栧畷铏叏濠靛嫬鐏俊鐐插€垮鑽も偓娑櫭悡鍫ユ煥濞戞﹩妲堕�?
 * @returns 闂佸憡鐟崹鎶藉极閵堝棛顩查幖杈剧悼閹煎ジ鏌涙繝鍌氭倯闁伙富鍠楀蹇涘礃椤忓懐鏆?key 闁诲孩绋掗〃鍫ヮ敄娴ｅ湱鈻旈悘鐐插€甸�?
 */
function buildTokensKey(tokens: Array<{ text: string; start_ms: number; end_ms: number }>): string {
  return tokens.map((t) => `${t.text}\u0001${t.start_ms}\u0001${t.end_ms}`).join('\u0002');
}

/**
 * 闂佸搫绉烽～澶婄暤娴ｅ浜归柟鎯у暱椤ゅ懘鏌熺紒銏犲箺闁哄倷绶氬顕€宕奸弴鐕傜吹闂佸搫娲ら悺銊╁蓟婵犲洤绠ラ柍褜鍓熷�?token span �?`--sweep` CSS 闂佸憡鐟﹂敃銏ゅ闯濞差亝鏅€光偓閸曘劍鏁甸梺鍛婃煟閸斿苯鐣烽柆宥呯濠靛鈧喓鈧鍠栫换姗€鍩€椤掍礁濮囬柣鈯欏嫷娈楁俊顖滄嚀閻︺劑鏌?
 * @param spans �?tokens 婵炴垶鎸撮崑鎾斥槈閹绢垰浜鹃柣搴ｆ暩閹虫挾鑺遍弻銉﹀�?span 闂佺绻愰崯鎵矆瀹€鍕瀬闁规鍠氶惌瀣�?
 * @param tokens token 闁瑰吋娼欑换鎰板垂椤忓牊鏅柛顐ｇ箖閸庢捇鎮硅閺€閬嶎敆濞戙垹绫嶉柛顐ｆ礃閿涚喖鏌熺€靛壊鍔滅紒杈ㄥ哺�?
 * @param timeMs 閻熸粎澧楅幐鍛婃櫠閻樺啿顕遍柟宄扮焾閸氣偓闂佹眹鍔岀€氼參骞愰柆宥呯哗闁绘劦鍓氶ˇ褔姊婚崒婵囧涧缂佽鲸鐟ヨ妞ゆ劑鍊ゅ锟犳煥濞戞﹩妲堕柍?
 */
function updateTokenSweep(
  spans: HTMLSpanElement[],
  tokens: Array<{ text: string; start_ms: number; end_ms: number }>,
  timeMs: number,
) {
  tokens.forEach((token, i) => {
    const span = spans[i];
    if (!span) return;

    if (timeMs >= token.start_ms && timeMs <= token.end_ms) {
      // Fallback to plain text rendering
      const duration = Math.max(1, token.end_ms - token.start_ms);
      const progress = (timeMs - token.start_ms) / duration;
      span.style.setProperty('--sweep', Math.min(1, Math.max(0, progress)).toString());
    } else if (timeMs > token.end_ms) {
      // Fallback to plain text rendering
      span.style.setProperty('--sweep', '1');
    } else {
      // Fallback to plain text rendering
      span.style.setProperty('--sweep', '0');
    }
  });
}

/**
 * �?token 閻熸粏鍩囬崹鍦閳ョ偨鈧帡宕ｆ径灞藉脯闂佽绻樺褎鎱ㄩ埡浣烘殕婵炴垶鐟﹂弳顏堟偣瑜旈弨閬嶅焵椤戣法顦︾紓宥咁儔瀹曟粌顓奸崼顐ｆ杸闂佹寧绋戦懟顖炴嚐閻斿吋鍋?`updateTokenSweep` 婵＄偟鎳撳畷顒佹叏閳哄偆娈楁俊顖滄嚀閻︺劑鏌?
 * @param container 閻熸粎澧楅幐鍛婃櫠閻樺灚鍋橀悘鐐靛亾閻庮噣鏌￠崼顐㈠妞ゆ梹鍔欏畷鎶解€﹂幒鏃傤槱闂備緡鍋呴懝楣冩偉閼哥數鈻?`#lyric-text-inner`闂佹寧绋戦ˇ顓㈠焵?
 * @param tokens 閻熸粎澧楅幐鍛婃櫠閻樺灚鍋樼€光偓閳ь剙鈻?token 闁瑰吋娼欑换鎰板垂椤忓牆�?
 * @param currentTimeMs 閻熸粎澧楅幐鍛婃櫠閻樺啿顕遍柟宄扮焾閸氣偓闂佹眹鍔岀€氼參骞愰柆宥呯哗闁绘劦鍓氶ˇ褔姊婚崒婵囧涧缂佽鲸鐟ヨ妞ゆ劑鍊ゅ锟犳煥濞戞﹩妲堕柍?
 */
function renderLyricWithTokens(container: HTMLElement, tokens: Array<{ text: string; start_ms: number; end_ms: number }>, currentTimeMs: number) {
  const nextKey = buildTokensKey(tokens);
      // Fallback to plain text rendering
  if (currentLyricTokenKey !== nextKey || tokenSpans.length !== tokens.length || container.children.length !== tokens.length) {
    setCurrentLyricTokenKey(nextKey);
    container.innerHTML = '';
    setTokenSpans([]);

    tokens.forEach((token) => {
      const span = document.createElement('span');
      span.className = 'lyric-token';
      span.textContent = token.text;
      span.setAttribute('data-text', token.text);
      span.style.whiteSpace = 'pre';
      container.appendChild(span);
      tokenSpans.push(span);
    });
  }

  updateTokenSweep(tokenSpans, tokens, currentTimeMs);
}


/**
 * �?token 閻熸粏鍩囬崹鍦閳ョ偨鈧帡宕ｆ径灞藉脯闁诲繒鍋炲ú鏍閹达箑绠戝〒姘ｅ亾闁绘捁鍩栫粙濠囧箛閻楀牊銆冮梺鍝勵槼濞夋洖鈻撻幋锝冧汗闁规儳鍟块·鍛存偠濞戞鐒跨紒杈ㄧ箘閳ь剙婀遍崑鐔肩嵁閸ャ劎鈻旈幖娣灪閺嗩亪鎮硅閺€閬嶅焵椤戞寧顦风紒鏃€鎸抽幊娑氣偓闈涙啞閻ｉ亶姊洪锝呭�?sweep 婵°倕鍊圭湁閻庡灚甯℃俊?
 * @param container 闂傚倸锕ら崢鏍不娴煎瓨顥堥柕蹇婂墲缁惰尙鎲搁悧鍫熷碍濠⒀呭Х閹澘鐣濋埀顒€鈻撻幋锕€妫橀柛銉ｅ妽閹烽亶鎮楅崷顓熷殌婵炲懏甯￠弫宥夊锤?mp-lyric-line-inner`闂佹寧绋戦ˇ顓㈠焵?
 * @param tokens 閻熸粎澧楅幐鍛婃櫠閻樺灚鍋樼€光偓閳ь剙鈻?token 闁瑰吋娼欑换鎰板垂椤忓牆�?
 * @param currentTimeMs 閻熸粎澧楅幐鍛婃櫠閻樺啿顕遍柟宄扮焾閸氣偓闂佹眹鍔岀€氼參骞愰柆宥呯哗闁绘劦鍓氶ˇ褔姊婚崒婵囧涧缂佽鲸鐟ヨ妞ゆ劑鍊ゅ锟犳煥濞戞﹩妲堕柍?
 */
function renderMpLyricWithTokens(
  container: HTMLElement,
  tokens: Array<{ text: string; start_ms: number; end_ms: number }>,
  currentTimeMs: number,
) {
  const nextKey = buildTokensKey(tokens);

  if (
    currentMpLyricTokenKey !== nextKey ||
    mpTokenSpans.length !== tokens.length ||
    container.children.length !== tokens.length
  ) {
    setCurrentMpLyricTokenKey(nextKey);
    container.textContent = '';
    setMpTokenSpans([]);

    tokens.forEach((token) => {
      const span = document.createElement('span');
      span.className = 'mp-lyric-token';
      span.textContent = token.text;
      span.setAttribute('data-text', token.text);
      span.style.whiteSpace = 'pre';
      container.appendChild(span);
      mpTokenSpans.push(span);
    });
  }

  updateTokenSweep(mpTokenSpans, tokens, currentTimeMs);
}


function getEstimatedLyricPositionMs(nowPerfMs: number): number {
  if (!isPlaying) return activeLyricBasePositionMs;
  const delta = nowPerfMs - activeLyricBasePerfMs;
  return activeLyricBasePositionMs + Math.max(0, delta);
}

export function resetIslandLyricScroll() {
  setLyricScrollLineStartMs(null);
  setLyricScrollNextLineTimeMs(null);
  setLyricScrollLastX(0);
  lyricTextInner.style.transform = "";
  if (mpCurrentLyricInner) mpCurrentLyricInner.style.transform = "";
}

function hasActiveIslandLyricScroll(): boolean {
  return lyricScrollLineStartMs !== null
    && lyricScrollNextLineTimeMs !== null
    && lyricScrollNextLineTimeMs > lyricScrollLineStartMs;
}

function applyIslandLyricScroll(positionMs: number) {
  if (!hasActiveIslandLyricScroll()) {
    if (lyricTextInner.style.transform !== "") lyricTextInner.style.transform = "";
    if (mpCurrentLyricInner && mpCurrentLyricInner.style.transform !== "") mpCurrentLyricInner.style.transform = "";
    setLyricScrollLastX(0);
    return;
  }

  const startMs = lyricScrollLineStartMs as number;
  const nextMs = lyricScrollNextLineTimeMs as number;
  const duration = Math.max(1, nextMs - startMs);
  const holdMs = duration >= 1000 ? 1000 : 0;
  const scrollStart = startMs + holdMs;
  const scrollEnd = Math.max(scrollStart + 1, nextMs - 500);
  const scrollDuration = Math.max(1, scrollEnd - scrollStart);
  const progress = positionMs < scrollStart
    ? 0
    : Math.min(1, (positionMs - scrollStart) / scrollDuration);
      // Fallback to plain text rendering
  const overflow = Math.max(0, lyricTextInner.scrollWidth - lyricText.clientWidth);
  if (overflow <= 1) {
    if (lyricTextInner.style.transform !== "") lyricTextInner.style.transform = "";
    setLyricScrollLastX(0);
  } else {
    const x = -overflow * progress;
    if (Math.abs(x - lyricScrollLastX) > 0.2) {
      lyricTextInner.style.transform = `translateX(${x}px)`;
      setLyricScrollLastX(x);
    }
  }
      // Fallback to plain text rendering
  if (mpCurrentLyricInner && mpCurrentLyricOuter) {
    const mpOverflow = Math.max(0, mpCurrentLyricInner.scrollWidth - mpCurrentLyricOuter.clientWidth);
    if (mpOverflow <= 1) {
      if (mpCurrentLyricInner.style.transform !== "") mpCurrentLyricInner.style.transform = "";
    } else {
      mpCurrentLyricInner.style.transform = `translateX(${-mpOverflow * progress}px)`;
    }
  }
}

function ensureLyricTokenAnimationLoop() {
  if (tokenAnimationId !== null) return;
  setLyricFpsWindowStartMs(0);
  setLyricFpsFrameCount(0);

  const tick = (now: number) => {
    const hasTokens = !!activeLyricTokens && activeLyricTokens.length > 0;
    const hasScroll = hasActiveIslandLyricScroll();
    if (!hasTokens && !hasScroll) {
      setTokenAnimationId(null);
      return;
    }

    const estimatedPosMs = getEstimatedLyricPositionMs(now);
    if (hasTokens) {
      const tokens = activeLyricTokens as Array<{ text: string; start_ms: number; end_ms: number }>;
      renderLyricWithTokens(lyricTextInner, tokens, estimatedPosMs);
      // Fallback to plain text rendering
      if (mpCurrentLyricInner) {
        renderMpLyricWithTokens(mpCurrentLyricInner, tokens, estimatedPosMs);
      }
    }
    applyIslandLyricScroll(estimatedPosMs);

    if (lyricFpsWindowStartMs === 0) {
      setLyricFpsWindowStartMs(now);
      setLyricFpsFrameCount(0);
    }
    setLyricFpsFrameCount(lyricFpsFrameCount + 1);
    const elapsed = now - lyricFpsWindowStartMs;
    if (elapsed >= 2000) {
      const fps = (lyricFpsFrameCount * 1000) / elapsed;
      logd(TAG, `[LyricSweep] raf fps=${fps.toFixed(1)} playing=${isPlaying}`);
      setLyricFpsWindowStartMs(now);
      setLyricFpsFrameCount(0);
    }

    setTokenAnimationId(requestAnimationFrame(tick));
  };

  setTokenAnimationId(requestAnimationFrame(tick));
}

export function stopLyricTokenAnimationLoop() {
  if (tokenAnimationId !== null) {
    cancelAnimationFrame(tokenAnimationId);
    setTokenAnimationId(null);
  }
  setActiveLyricTokens(null);
}

function renderLyricPlainText(container: HTMLElement, text: string) {
  stopLyricTokenAnimationLoop();
  setCurrentLyricTokenKey("");
  setTokenSpans([]);
  if (container.textContent !== text || container.children.length > 0) {
    container.textContent = text;
  }
}

/** �?nearby_lyrics 闂佹眹鍨婚崰鎰板垂濮樿京鐭欓柛鎰皺�?key闂佹寧绋掑銊ッ规径鎰Е閻忕偟鍋撻悗顕€鏌￠崼顐㈠閻庡灚绮撳畷娆撴惞閻熸壆鐤€濠电偛妫岄埀顒€纾喊宥夊级閳哄嫭顥夊┑顔惧仦閹棁绠涢幘鍐测枏闂佹寧绋戦惌鍌涘閳哄懎绀傜€广儱鎳庨ˉ灞炬叏濠靛棛鐒搁柛锝呮啞瀵板嫬顓奸崪浣告闂佸ジ鏀卞娆戜焊椤曗偓閺屽﹤顓兼径瀣珦婵?*/
function buildLineKeys(nearby: Array<{ text: string; is_current: boolean }>): string[] {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  for (const l of nearby) {
    const c = counts.get(l.text) ?? 0;
    counts.set(l.text, c + 1);
    keys.push(`${l.text}#${c}`);
  }
  return keys;
}

/**
 * �?FLIP闂佹寧绋戝﹢姊歳st-Last-Invert-Play闂佹寧绋戦ˇ鐗堜繆瑜斿鐢割敍濠垫劕鏁ゆ繝銏ｅ煐娣囨椽銆侀幋婵愭桨鐎光偓閸愵亝袚闂佸憡甯掑ú锕€鐣烽弻銉ョ睄閻犲搫鎼崜濂稿级閻愵亜濮傚ù婊呭亾缁嬪鍩€椤掑嫬鍐€鐎瑰嫪鍗抽幐顒佺節婵犲啫鐏︾紒顔芥尦瀹曟繈鈥﹂幒鏃傜�?
 * 婵犮垼娉涚粔鍫曞极閵堝洦鍋橀悘鐐村灊缁潧霉閿濆懐肖娴滄盯寮堕埡浣瑰婵炴惌鍣ｉ弫宥囦沪閻愵剛鍘愰柣鐐寸☉婵傛梻鍒掗悩铏劅闁哄洢鍨归崝銉︾箾閿濆倵鍋撻崘鎻掓辈闂佹寧绋戦惌鍌炲焵椤戣棄浜鹃梺鍛婂灴缂傛岸銆侀幋锕€瑙﹂柟瀛樼矌閻熸劖绻涢敐鍌楀亾閸愬弶鐦旈�?
 * �?tokens 闂傚倸鐗忛崑鐔煎煘閺嶎厽鏅悘鐐舵閻忕喎鈽夐幘铏儓缂傚秴顑夊畷婊冾吋閸偅鏂€濠电偞鎸稿鍫曟偂鐎ｎ喗鐒婚柟閭﹀墰閹?token spans 婵炲濮伴崕閬嶆偪閸曨垱鍋濋柡澶婄仢楠炪垽鏌熷畡閭︽晝K�?sweep 婵°倕鍊圭湁閻庡灚甯℃俊?
 */
function renderNearbyLyricsFlip(
  nearby: Array<{ text: string; is_current: boolean }>,
  tokens: Array<{ text: string; start_ms: number; end_ms: number }> | null,
  currentTimeMs: number,
) {
      // Fallback to plain text rendering
  for (const [k, el] of Array.from(prevLineMap)) {
    if (!mpLyricText.contains(el)) prevLineMap.delete(k);
  }
      // Fallback to plain text rendering
  if (prevLineMap.size === 0) {
    while (mpLyricText.firstChild) mpLyricText.removeChild(mpLyricText.firstChild);
  }

  const keys = buildLineKeys(nearby);
      // Fallback to plain text rendering
  const oldRects = new Map<HTMLElement, DOMRect>();
  for (const el of prevLineMap.values()) {
    oldRects.set(el, el.getBoundingClientRect());
  }
      // Fallback to plain text rendering
  const newMap = new Map<string, HTMLElement>();
  const reusedEls: HTMLElement[] = [];
  const enteringEls: HTMLElement[] = [];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < nearby.length; i++) {
    const key = keys[i];
    const line = nearby[i];
    let el = prevLineMap.get(key);
    let isNew = false;
    if (el) {
      prevLineMap.delete(key);
      reusedEls.push(el);
    } else {
      el = document.createElement("div");
      el.textContent = line.text;
      enteringEls.push(el);
      isNew = true;
    }
      // Fallback to plain text rendering
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
    el.style.width = "";
    el.style.transition = "";
    el.style.transform = "";
      // Fallback to plain text rendering
    let cls = "mp-lyric-line";
    if (line.is_current) cls += " mp-lyric-current";
    if (isNew) cls += " entering";
    el.className = cls;
      // Fallback to plain text rendering
    if (line.is_current) {
      let inner = el.querySelector(".mp-lyric-line-inner") as HTMLSpanElement | null;
      if (!inner) {
        el.textContent = "";
        inner = document.createElement("span");
        inner.className = "mp-lyric-line-inner";
        el.appendChild(inner);
      }
      if (mpCurrentLyricInner !== inner) {
        inner.style.transform = '';
      // Fallback to plain text rendering
        setMpTokenSpans([]);
        setCurrentMpLyricTokenKey('');
      }
      if (tokens && tokens.length > 0) {
      // Fallback to plain text rendering
        renderMpLyricWithTokens(inner, tokens, currentTimeMs);
      } else {
      // Fallback to plain text rendering
        if (inner.children.length > 0 || inner.textContent !== line.text) {
          inner.textContent = line.text;
        }
        setMpTokenSpans([]);
        setCurrentMpLyricTokenKey('');
      }
      setMpCurrentLyricInner(inner);
      setMpCurrentLyricOuter(el);
    } else {
      if (el.querySelector(".mp-lyric-line-inner")) {
        el.textContent = line.text;
      } else if (el.textContent !== line.text) {
        el.textContent = line.text;
      }
    }
    newMap.set(key, el);
    fragment.appendChild(el);
  }
      // Fallback to plain text rendering
  const exitingEls: HTMLElement[] = Array.from(prevLineMap.values());
      // Fallback to plain text rendering
  for (const el of exitingEls) {
    if (el.parentNode) el.remove();
  }
      // Fallback to plain text rendering
  mpLyricText.appendChild(fragment);
      // Fallback to plain text rendering
  void mpLyricText.offsetHeight;
      // Fallback to plain text rendering
  for (const el of reusedEls) {
    const oldRect = oldRects.get(el);
    if (!oldRect) continue;
    const newRect = el.getBoundingClientRect();
    const dy = oldRect.top - newRect.top;
    if (dy !== 0) {
      const isCurrent = el.classList.contains("mp-lyric-current");
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px) scale(${isCurrent ? 1.05 : 1})`;
    }
  }
      // Fallback to plain text rendering
  void mpLyricText.offsetHeight;
      // Fallback to plain text rendering
  requestAnimationFrame(() => {
    for (const el of reusedEls) {
      el.style.transition = "";
      el.style.transform = "";
    }
    for (const el of enteringEls) {
      el.classList.remove("entering");
    }
  });

  setPrevLineMap(newMap);
}

/** �?mpLyricText 闁荤偞鍑归崑鍕矗閻愵剛顩烽柡宓啰鈧鏌￠埀顒勵敍濠垫劖鑸归梺鐑╂櫆閻楁宕瑰杈╂／妞ゆ牗绋掗悗顕€鏌￠崼顐㈠⒕缂佽鲸鐟︽�?"�?闂侀潧妫旈悞锕傛偤閺囥垹瑙︾€广儱绻掔粈鍡涙煛閸愨晛鍔堕柣銊у枛閹粙鈥﹂幒鏃傤槷婵炴垶鎸堕崹鍦�?FLIP 闂佺粯顭堥崺鏍�?*/
export function resetMpLyricFlipState() {
  prevLineMap.clear();
      // Fallback to plain text rendering
  setMpCurrentLyricInner(null);
  setMpCurrentLyricOuter(null);
  setMpTokenSpans([]);
  setCurrentMpLyricTokenKey('');
}

export function initLyricRenderer() {

  listen<string>("lyric-mode-changed", (event) => {
    setLyricMode(event.payload);
    if (lyricMode === "off" && pageStateMachine.getCurrentPage() === PageState.Lyric) {
      setUserChosenView("time");
      setView("time", true);
    }
    updateSwitcherUI();
  });

  listen<{ text: string | null; title: string; artist: string; genre?: string; position_ms?: number; duration_ms?: number; is_playing?: boolean; seekable?: boolean; nearby_lyrics?: Array<{ text: string; is_current: boolean }>; tokens?: Array<{ text: string; start_ms: number; end_ms: number }>; line_start_ms?: number; next_line_time_ms?: number } | null>("lyric-update", (event) => {

    if (event.payload === null) {
      const wasPlaying = isMusicPlaying;
      setIsMusicPlaying(false);
      setIsPlaying(false);
      updatePlayIcon();

      if (wasPlaying) {
        setUserChosenView("time");
        setView("time", true);
      }

      updateSwitcherUI();
      resetIslandLyricScroll();
      stopLyricTokenAnimationLoop();
      return;
    }

    const wasPlaying = isMusicPlaying;
    setIsMusicPlaying(true);
    const { text, title, artist, position_ms, duration_ms } = event.payload;
    if (position_ms !== undefined) {
      setActiveLyricBasePositionMs(position_ms);
      setActiveLyricBasePerfMs(performance.now());
    }
      // Fallback to plain text rendering
    if (event.payload.is_playing !== undefined && event.payload.is_playing !== isPlaying) {
      setIsPlaying(event.payload.is_playing);
      updatePlayIcon();
    }
      // Fallback to plain text rendering
    if (event.payload.seekable !== undefined) {
      updateSeekable(event.payload.seekable);
    }
      // Fallback to plain text rendering
    if (duration_ms && duration_ms > 0 && position_ms !== undefined) {
      setCurrentDurationMs(duration_ms);
      const pct = Math.min(100, Math.max(0, (position_ms / duration_ms) * 100));
      if (!isSeeking) {
        progressFill.style.width = `${pct}%`;
        progressThumb.style.left = `${pct}%`;
      }
      if (!isMpSeeking) {
        mpProgressFill.style.width = `${pct}%`;
        mpProgressThumb.style.left = `${pct}%`;
        mpTimeCurrent.textContent = formatTime(position_ms);
        mpTimeTotal.textContent = formatTime(duration_ms);
      }
    }

    if (lyricMode === "info" || text === null) {
      resetIslandLyricScroll();
      renderLyricPlainText(lyricTextInner, "");
      lyricMeta.textContent = title;
      lyricMeta.style.fontSize = "13px";
      lyricMeta.style.color = "rgba(255,255,255,0.85)";
    } else {
      lyricMeta.style.fontSize = "";
      lyricMeta.style.color = "";
      lyricMeta.textContent = `${artist} - ${title}`;
      if (event.payload.line_start_ms !== undefined && event.payload.next_line_time_ms !== undefined) {
        if (lyricScrollLineStartMs !== event.payload.line_start_ms) {
          lyricTextInner.style.transform = "";
          if (mpCurrentLyricInner) mpCurrentLyricInner.style.transform = "";
          setLyricScrollLastX(0);
        }
        setLyricScrollLineStartMs(event.payload.line_start_ms);
        setLyricScrollNextLineTimeMs(event.payload.next_line_time_ms);
        applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
        ensureLyricTokenAnimationLoop();
      } else {
        resetIslandLyricScroll();
      }
      const tokens = event.payload.tokens;
      if (tokens && tokens.length > 0 && position_ms !== undefined) {
        setActiveLyricTokens(tokens);
        renderLyricWithTokens(lyricTextInner, tokens, position_ms);
        ensureLyricTokenAnimationLoop();
      } else {
        setActiveLyricTokens(null);
        setCurrentLyricTokenKey("");
        setTokenSpans([]);
        if (lyricTextInner.children.length > 0) {
          renderLyricPlainText(lyricTextInner, text);
          applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
          ensureLyricTokenAnimationLoop();
        } else if (lyricTextInner.textContent !== text) {
          lyricText.classList.add("fade");
          window.setTimeout(() => {
            renderLyricPlainText(lyricTextInner, text);
            applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
            ensureLyricTokenAnimationLoop();
            lyricText.classList.remove("fade");
          }, 140);
        } else {
          applyIslandLyricScroll(position_ms ?? activeLyricBasePositionMs);
          ensureLyricTokenAnimationLoop();
        }
      }
    }

    if (!wasPlaying && lyricMode !== "off" && userChosenView === "time") {
      setUserChosenView("lyric");
      setView("lyric", true);
    }

    const nearby = event.payload.nearby_lyrics;
    const mpTokens = event.payload.tokens ?? null;
    const mpCurrentTimeMs = position_ms ?? activeLyricBasePositionMs;
    if (nearby && nearby.length > 0) {
      renderNearbyLyricsFlip(nearby, mpTokens, mpCurrentTimeMs);
    } else if (text !== null && text !== undefined) {
      if (text === "") {
        mpLyricText.textContent = "";
        resetMpLyricFlipState();
      } else {
        if (mpLyricText.children.length === 0) {
          mpLyricText.textContent = text;
          resetMpLyricFlipState();
        }
      }
    } else {
      mpLyricText.textContent = title;
      resetMpLyricFlipState();
    }

    //updateSwitcherUI();
  });

}
