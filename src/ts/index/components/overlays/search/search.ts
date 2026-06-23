import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { capsule } from "../dom";
import { currentView } from "../state";
import { OverlayPriority } from "../state-machines/overlay";
import { overlayStateMachine } from "../state-machines/overlay-machine";
import { setView } from "./view-switcher";
import { loge } from "../logger";
import type { ViewMode } from "../types";
import { $ } from "../../shared";
import { animateHeight } from "./rAF";


export const searchInput = $<HTMLInputElement>("search-input");
export const searchResults = $<HTMLDivElement>("search-results");
export const searchPrevBtn = $<HTMLButtonElement>("search-prev-btn");
export const searchNextBtn = $<HTMLButtonElement>("search-next-btn");
export const searchPageLabel = $<HTMLSpanElement>("search-page-label");

const TAG = "Search";



interface SearchResult {
  id: string;
  title: string;
  desc: string;
  icon: string;
  action: string;
}

interface SearchQueryResponse {
  items: SearchResult[];
  has_next: boolean;
}


let activeIndex = -1;
let results: SearchResult[] = [];
let debounceTimer: number | null = null;
let dismissSyncTimer: number | null = null;
const DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;
let previousView: Exclude<ViewMode, "search"> = "time";
let currentQuery = "";
let currentOffset = 0;
let hasNextPage = false;
let searchRequestId = 0;
const SEARCH_PRIORITY = OverlayPriority.Search;

// ===== Window height sync =====

const BODY_PAD = 5; // body padding-top

function syncSearchWindowHeight() {
  requestAnimationFrame(() => {
    let h: number;
    if (capsule.classList.contains("search-expanded")) {
      // 濠电姷鏁告慨鐑藉极閹间礁纾婚柣妯款嚙缁犲灚銇勮箛鎾搭棤缂佲偓婵犲洦鐓冪憸婊堝礈濮樿鲸宕叉繛鎴炵懃缁剁偤鎮楅敐搴′簽妞わ缚鍗抽幃?CSS 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫鎾绘偐閸愯弓鐢婚梻浣瑰濞叉牠宕愯ぐ鎺戠柧婵犻潧顑嗛悡蹇涚叓閸パ屽剰闁逞屽墯濞茬喎顫忔繝姘兼晬婵炴垶姘ㄩ鏇㈡倵閻熸澘顥忛柛鐘虫礈閼鸿鲸绺介崨濠勫幈闁硅偐琛ラ埀顒佸墯閸斿姊洪棃娑欐悙閻庢碍婢橀锝夘敋閳ь剙鐣烽幒鎴旀婵炲棙鍨靛☉褔姊婚崒娆戝妽闁诡喖鐖煎畷婵囨償閵娿儱鍋嶉悷婊勫灴閹﹢宕橀瑙ｆ嫼缂備礁顑嗙€笛冿耿娴煎瓨鐓犲Λ棰佽兌閻瑦銇勯姀鈩冾棃鐎规洝绮剧粻娑㈠箻閹绘帩妫滈梻浣藉吹閸犳劙鎮烽妷褉鍋撳鐓庡⒋闁糕斂鍨藉鎾閿涘嫬骞愬┑鐐舵彧缁蹭粙骞楀鍡椻偓鏉戔攽閻愬樊鍤熷┑顖氼嚟缁骞樼拠鑼枃闂佸搫绋侀崢濂告偂濞戙垺鐓曢柟鑸妽濞呭懘鏌＄€ｎ偅灏电紒?transition 缂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌ｉ幋锝呅撻柛濠傛健閺屻劑寮撮悙娴嬪亾閸濄儳涓嶅ù鐓庣摠閸嬶綁鏌涢妷鎴濆閺嬫瑩姊?
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--search-expanded-h");
      h = parseFloat(raw) || capsule.offsetHeight;
    } else {
      h = capsule.offsetHeight;
    }
    animateHeight(h + BODY_PAD + 2);
  });
}

function updatePagination() {
  const visible = currentQuery.length > 0 && (results.length > 0 || currentOffset > 0);
  searchPrevBtn.hidden = !visible;
  searchNextBtn.hidden = !visible;
  searchPageLabel.hidden = !visible;
  searchPageLabel.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1}`;
  searchPrevBtn.disabled = currentOffset === 0;
  searchNextBtn.disabled = !hasNextPage;
}

function resetSearchPagination() {
  currentQuery = "";
  currentOffset = 0;
  hasNextPage = false;
  updatePagination();
}

async function fetchSearchPage(query: string, offset: number) {
  const trimmed = query.trim();
  if (!trimmed) {
    searchRequestId += 1;
    resetSearchPagination();
    renderResults([], 0, false);
    return;
  }

  currentQuery = trimmed;
  currentOffset = offset;
  hasNextPage = false;
  updatePagination();

  const requestId = ++searchRequestId;

  try {
    const res = await invoke<SearchQueryResponse>("search_query", {
      query: trimmed,
      offset,
      count: PAGE_SIZE,
    });
    if (requestId !== searchRequestId || currentView !== "search" || trimmed !== currentQuery) {
      return;
    }
    renderResults(res.items, offset, res.has_next);
  } catch (err: any) {
    if (requestId !== searchRequestId || currentView !== "search" || trimmed !== currentQuery) {
      return;
    }
    const errStr = String(err);
    loge(TAG, "search_query failed:", errStr, err);
    renderError(errStr);
  }
}

// ===== Render =====

// ===== Render =====

function renderResults(items: SearchResult[], offset = 0, nextPageAvailable = false) {
  results = items;
  activeIndex = items.length > 0 ? 0 : -1;
  currentOffset = offset;
  hasNextPage = nextPageAvailable;
  searchResults.innerHTML = "";
  updatePagination();

  if (items.length === 0) {
    capsule.classList.remove("search-expanded");
    capsule.classList.add("search-active");
    syncSearchWindowHeight();
    return;
  }

  capsule.classList.remove("search-active");
  capsule.classList.add("search-expanded");

  items.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "search-result-item" + (i === 0 ? " active" : "") + (item.desc ? " has-desc" : "");

    const icon = document.createElement("div");
    icon.className = "search-result-icon";
    icon.textContent = item.icon || "*";

    const text = document.createElement("div");
    text.className = "search-result-text";

    const title = document.createElement("div");
    title.className = "search-result-title";
    title.textContent = item.title;
    text.appendChild(title);

    if (item.desc) {
      const desc = document.createElement("div");
      desc.className = "search-result-desc";
      desc.textContent = item.desc;
      text.appendChild(desc);
    }

    el.appendChild(icon);
    el.appendChild(text);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      selectResult(i);
    });
    searchResults.appendChild(el);
  });
  syncSearchWindowHeight();
}

function renderError(msg: string) {
  results = [];
  activeIndex = -1;
  hasNextPage = false;
  searchResults.innerHTML = "";
  searchPrevBtn.hidden = true;
  searchNextBtn.hidden = true;
  searchPageLabel.hidden = true;

  capsule.classList.remove("search-active");
  capsule.classList.add("search-expanded");

  const el = document.createElement("div");
  el.className = "search-error-hint";
  el.textContent = msg;
  searchResults.appendChild(el);
  syncSearchWindowHeight();
}


// ===== Select =====

function selectResult(index: number) {
  if (index < 0 || index >= results.length) return;
  const item = results[index];
  void invoke("search_execute", { id: item.id, action: item.action });
  dismissSearch();
}

function updateActiveHighlight() {
  const items = searchResults.querySelectorAll(".search-result-item");
  items.forEach((el, i) => {
    el.classList.toggle("active", i === activeIndex);
  });
  const activeEl = items[activeIndex] as HTMLElement | undefined;
  activeEl?.scrollIntoView({ block: "nearest" });
}

// ===== Search request (debounce) =====

function doSearch(query: string) {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!query.trim()) {
    void fetchSearchPage("", 0);
    return;
  }
  debounceTimer = window.setTimeout(async () => {
    debounceTimer = null;
    void fetchSearchPage(query, 0);
  }, DEBOUNCE_MS);
}

// ===== Activate / Dismiss =====

export function activateSearch() {
  // Remember where we came from so we can go back
  if (currentView !== "search") {
    previousView = currentView;
  }
  overlayStateMachine.setPriority(OverlayPriority.Search);
  // Clean other expand classes
  capsule.classList.remove("expanded", "lyric-collapsed", "agent-expanded", "music-expanded", "search-expanded", "email-expanded");
  capsule.classList.add("search-active");
  setView("search");
  searchRequestId += 1;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  searchInput.value = "";
  searchResults.innerHTML = "";
  results = [];
  activeIndex = -1;
  resetSearchPagination();
  searchInput.focus();
  // 闂傚倸鍊峰ù鍥敋瑜嶉湁闁绘垼妫勭壕濠氭煥濠靛棭妲哥痪鎯х秺閺屸€愁吋鎼粹€崇缂佺偓鍎冲锟犲蓟閵堝悿鍦偓锝庡亝閻濇洟鎮楃憴鍕鐎殿喖澧庨幑銏犫攽閸モ晝鐦堥梺绋挎湰缁矂銆傞搹鍦＝濞达絾褰冩禍楣冩⒑閸涘﹤濮﹀ù婊勭墵瀹曟垿骞橀懡銈呯ウ闂佸壊鐓堥崰鏍ㄦ叏鎼粹檧鏀介柍钘夋娴滀粙鏌涘▎蹇撴殭闁?focus闂傚倸鍊搁崐鎼佸磹閻戣姤鍊块柨鏃堟暜閸嬫挾绮☉妯诲櫧闁活厽鐟╅弻鐔告綇妤ｅ啯顎嶉梺绋垮椤ㄥ﹪寮诲☉姘勃缂備降鍨瑰▓濂告⒑閹稿海绠撴繛璇у閳ь剚纰嶅銊╁焵椤掑倹鍤€濠㈢懓锕畷鏉课旈埀顒勩€呮總绋课╅柍鍝勫€甸幏娲⒒閸屾氨澧涚紒瀣尵缁宕樺ù瀣杸濡炪倖姊婚崑鎾诲汲椤掑倵鍋撶憴鍕闁告梹鐟╅獮鍐╃鐎ｎ偄浠洪梺姹囧灮椤ｎ喚妲?set_focus 濠?webview input focus 缂傚倸鍊搁崐鎼佸磹閹间礁纾归柣鎴ｅГ閸婂潡鏌ㄩ弴妤€浜惧銈庡亜缁绘垹鎹㈠┑鍡╂僵妞ゆ帒鍋婄槐杈ㄧ節绾版ɑ顫婇柛銊ョ仛缁旂喖宕奸悢绋垮伎?
  setTimeout(() => searchInput.focus(), 50);
}

export function dismissSearch() {
  // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫鎾绘偐閸愯弓鐢绘俊鐐€栭悧妤冪矙閹炬眹鈧懘宕ｆ径宀€鐦堥梻鍌氱墛缁嬫帡鏁嶉弮鍫熺厾闁哄娉曟禒銏ゆ婢舵劖鐓ユ繝闈涙婵吋绻涢懖鈺佹瀻闂囧绻濇繝鍌氭殶缂佸妞介弻鈥崇暆閳ь剟宕伴弽顓犲祦闁糕剝鍑瑰Σ濠氭⒑閸濆嫭顥″瀛樻倐婵＄敻宕熼姣佳囨煕濞戝崬鏋涙繛鍛囧洦鈷戦梺顐ゅ仜閼活垱鏅堕娑栦簻闁哄啠鍋撻柣妤冨Т閻ｇ兘寮跺▎鐐兊闁荤娀缂氬▍锝夋偪閸ヮ剚鈷戦柣鐔告緲閳锋梻绱掗鍛仸鐎规洘娲熼獮瀣熆濠靛棛绉虹€规洘顨婂畷妤呮嚃閳哄啠鏋忛梻鍌欑閹诧繝鎮烽妷鈺傛櫇闁靛鏅涙闂佸憡娲﹂崹浼村礃閳ь剟姊洪棃娴ゆ盯鍩€椤掍焦鍙忛柛銉墯閳锋垹绱掔€ｎ偒鍎ラ柛搴㈠姉缁辨帞鎷犻幓鎺濅紑濠碘€冲级閸旀瑩鐛幒妤€绠婚柛鎾茬劍閸ゅ矂姊绘担绋款棌闁绘挸鐗撳畷鏉款潩椤撶媭娴勯梺璇″瀻閳ь剟寮ㄦ禒瀣叆婵炴垶锚椤忊晛霉閻樺磭鐭掗柡灞剧⊕缁绘繈宕掑☉妯规樊闂備胶绮笟妤呭窗閺嶎収鏁囧┑鍌滎焾濡炶棄霉閿濆懏鍟為柛濠庡灠閳规垿鎮╅鑲╀紘濠电偛顦伴惄顖炲极閸愵喖唯闁冲搫锕ラ弲婊堟⒑缂佹ɑ顥嗘繛鍜冪悼婢规洘绂掔€ｎ偆鍘遍柣蹇曞仦瀹曟ɑ绔熷鈧弻锛勨偓锝冨妼閳ь剚绻堝璇测槈閵忊€充汗闂佹儳娴氶崑鍡浰囬鐐╂斀闁炽儱鍟跨痪褔鏌涢弮鈧悷鈺呭Υ娴ｅ壊娼ㄩ柍褜鍓氶幈銊╁焵椤掑嫭鐓熸俊顖涙た閸熷繑淇婂顔肩仸婵﹦绮幏鍛矙濞嗙偓顥戦梻浣侯焾椤戝嫮娆㈠顒傛殾閻熸瑥瀚々鐑芥倵閿濆骸浜滃ù?
  if (overlayStateMachine.priority === SEARCH_PRIORITY) {
    overlayStateMachine.setPriority(OverlayPriority.None);
  }
  searchRequestId += 1;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  searchInput.value = "";
  searchInput.blur();
  searchResults.innerHTML = "";
  results = [];
  activeIndex = -1;
  resetSearchPagination();
  capsule.classList.remove("search-active", "search-expanded");
  setView(previousView, true);
  // 缂?CSS transition(350ms) 闂傚倸鍊搁崐宄懊归崶顒夋晪鐟滃秹婀侀梺缁樺灱濡嫮绮婚悩缁樼厵闁硅鍔﹂崵娆撴倵濮橆剦妲归柕鍥у楠炴帡骞嬪┑鎰偅闂備焦鎮堕崝宀勫磹瑜版帒绠為柕濞垮剻閻旂厧绠伴幖杈剧祷閳ь剚鍔欓弻锝夋偄閸濄儲鍤傜紓浣哄У閹瑰洭鎮伴鈧浠嬵敃閵忕姷浜伴梻浣侯焾缁绘劙藝椤栨稓顩插Δ锝呭暞閻擄綁鐓崶椋庡埌濞存粍绻堥弻锝呪攽閸パ勮癁濠殿喖锕︾划顖炲箯閸涙潙宸濆┑鐘插€瑰▓姗€姊绘担鍝勫付缂傚秴锕︾划濠氬冀瑜滈崵鏇㈡煟閵忕姴顥忛柡浣告閺屾盯寮撮悙鍏哥驳闂佸搫鎳岄崹钘夘潖閾忓湱纾兼俊顖氭惈椤酣姊烘潪鎵妽闁诡喖鍊块獮鍐ㄧ暦閸モ晝锛滃┑鈽嗗灠濠€杈╃不濮樿埖鈷戦梻鍫熺〒婢ф洟鏌涙繝鍌涘暈缂佸倸绉甸妶锝夊礃閳轰椒鐢绘繝鐢靛Т閿曘倝骞婃惔銊ｂ偓鍌炴嚃閳哄啰锛滈柣搴秵閸嬪嫬霉椤曗偓閺屾洟宕卞Δ鈧弳锝団偓瑙勬礀閻栧ジ鍨鹃弽顓ф晢闁稿本纰嶉悘鍫ユ倵鐟欏嫭澶勯柛瀣工閻ｇ兘鎮㈤崗纰辨濠电偞鍨堕悷锕€袙瀹€鍕拻闁稿本鑹鹃埀顒傚厴閹偤鏁傞柨顖氫壕缂佹绋戦幊鎰版儗濞嗘挻鐓欓弶鍫ョ畺濡绢噣鏌涢妶鍡楀闁靛洤瀚板浠嬵敃椤厾鎹曠紓鍌欒兌婵敻鎳濇ィ鍐ㄎラ柟鐑樺焾濞尖晠鏌ㄥ┑鍡樺櫢濠㈣娲熼弻?offsetHeight 濠电姷鏁告慨鐑藉极閹间礁纾绘繛鎴欏焺閺佸銇勯幘璺烘瀾闁告瑥绻橀幃妤呮濞戞瑦鍠愰梺娲诲幗閹瑰洤顫忔繝姘唶闁绘柨鍢查獮蹇涙⒑閹稿海绠撴い锔诲灡鐎靛ジ鎮╃紒妯煎帾婵犮垼娉涢悧鍡涘焵椤掍胶澧电€规洜鍠栧畷姗€顢欑憴锝嗗闂備礁鎲＄换鍌溾偓姘煎幖椤斿繐鈹戠€ｎ偆鍘遍柣搴秵閸撴瑩寮搁弬娆剧唵閻熸瑥瀚粈鍐磼缂佹绠撴い顐ｇ箞椤㈡﹢鎮╅幓鎺旑吋婵犵绱曢崑鎴﹀磹閺嶎厼鍨傚┑鍌滎焾绾惧灝鈹戦悩瀹犲缂佲偓閸岀偞鍊堕柣鎰絻閳锋梻绱掗悩鑽ょ暫闁哄本鐩、鏇㈠Χ閸涱喚鈧姊虹拠鑼妞ゆ洦鍙冮崺鈧?
  if (dismissSyncTimer !== null) clearTimeout(dismissSyncTimer);
  dismissSyncTimer = window.setTimeout(() => {
    dismissSyncTimer = null;
    syncSearchWindowHeight();
  }, 360);
}

// ===== Init =====

export function initSearch() {
  // Input listener
  searchInput.addEventListener("input", () => {
    doSearch(searchInput.value);
  });

  [searchPrevBtn, searchNextBtn].forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
  });

  searchPrevBtn.addEventListener("click", () => {
    if (!currentQuery || currentOffset === 0) return;
    void fetchSearchPage(currentQuery, Math.max(0, currentOffset - PAGE_SIZE));
    searchInput.focus();
  });

  searchNextBtn.addEventListener("click", () => {
    if (!currentQuery || !hasNextPage) return;
    void fetchSearchPage(currentQuery, currentOffset + PAGE_SIZE);
    searchInput.focus();
  });

  // 闂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柛顐ｆ礀缁犵娀鏌熼幑鎰靛殭闁告艾缍婇弻鈥愁吋鎼粹€崇闂佹娊鏀卞Λ鍐蓟濞戙垹鍗抽柕濞垮劤娴犫晠姊?Alt+Space闂傚倸鍊搁崐鎼佸磹閻戣姤鍊块柨鏃堟暜閸嬫挾绮☉妯诲櫧闁活厽鐟╅弻鐔告綇妤ｅ啯顎嶉梺绋垮椤ㄥ﹪寮诲☉姘勃缂備降鍨瑰▓濂告⒑閹稿海绠撴繛璇у閳ь剚纰嶅銊╁焵椤掑倹鍤€濠㈢懓锕畷鏉课旈埀顒勩€呮總绋课╅柍鍝勫€甸幏娲⒒閸屾氨澧涢柣鈺婂灦閹澘顭ㄩ崨顖滐紲闁哄鐗勯崝宥囩矆鐎ｎ亖鏀介梽鍥春閺嶎偅宕叉繝闈涙－濞尖晜銇勯幘璺轰粧闁汇垻绮换婵嬫偨闂堟稐绮跺┑鈽嗗亝椤ㄥ牓骞戦姀銈呯闁规儳鐡ㄩ悵鐑芥⒑閸濆嫭宸濋柛鐘虫尵缁粯銈ｉ崘鈺冨幈濠电偞鍨靛畷顒勫几濞戞氨纾兼俊銈勮兌椤ｆ煡鏌曢崶褍顏い銏℃⒐閹峰懘姊归幇顒夋濠电姷鏁告慨鐑姐€傞挊澹╋綁宕ㄩ弶鎴濈€梻渚囧墮缁嬩線寮崟顒傜闁糕剝蓱鐏忣參鎮峰▎娆戠暤闁哄本鐩俊鐑筋敊閻撳寒娼介梻浣侯焾椤戝洦鎱ㄩ悽鍨床婵炴垯鍨圭粻锝夋煟韫囨梹銇熷ù婊庝邯婵℃挳宕橀妸銏＄€婚梺鍦亾濞兼瑦绂掗鐐粹拺鐟滅増甯掓禍浼存煕閻樺磭澧电€殿喚顭堥埥澶愬閿涘嫬骞楁繝鐢靛仦閸ㄩ潧鐣烽鈧埢宥咁吋閸ワ絽浜鹃悷娆忓缁岃法绱掗崣澶婂姢妞ゆ洏鍎靛畷鐔碱敆閸屾粎妲囬梺鐟板悑閻ｎ亪宕洪崟顐嬫盯宕奸妷锔规嫽闂佺鏈悷銊╁礂瀹€鍕厵闁惧浚鍋呭畷宀€鈧娲忛崕鎶藉焵椤掑﹦绉甸柛鎾寸懇瀹曠懓鈹戠€ｎ亞顔愬┑鐑囩秵閸撴瑦淇婇懖鈺冩／闁诡垎浣镐划闂佸搫鏈ú妯兼崲濞戙垹鍨傛い鏃傚帶椤酣姊绘担濮愨偓鈧柛瀣尭闇夐柣妯烘▕閸庢劙鏌ｉ幘鍐叉殶闁硅尙顭堥…銊╁醇濠靛牜妲舵繝鐢靛仜濡瑩宕归棃娑卞殨?
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.code === "Space") {
      e.preventDefault();
    }
  }, true);

  // Global Esc (capture phase to beat browser blur)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && currentView === "search") {
      e.preventDefault();
      e.stopImmediatePropagation();
      dismissSearch();
    }
  }, true);

  // Keyboard navigation inside search input
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        activeIndex = (activeIndex + 1) % results.length;
        updateActiveHighlight();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        activeIndex = (activeIndex - 1 + results.length) % results.length;
        updateActiveHighlight();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        selectResult(activeIndex);
      }
      return;
    }
  });

  // 濠电姷鏁告慨鐑藉极閸涘﹥鍙忓ù鍏兼綑閸ㄥ倿鏌ｉ幘宕囧哺闁哄鐗楃换娑㈠箣閻戝棛鍔烽梺鍝勬４闂勫嫰濡甸崟顖氱闁瑰瓨绻嶆导鈧柣搴ゎ潐閹搁娆㈠璺鸿摕闁绘梻鍘х粻鏌ユ煙娴煎瓨娑ф繛鍫幘缁辨挻鎷呴幓鎺嶅闂備礁澹婇崑鈧柟鍐叉喘瀹曟垿骞橀懡銈呯ウ闂佸壊鐓堥崰鏍ㄦ叏鎼淬劍鈷戦柣鐔告緲閺嗛亶姊虹敮顔剧М鐎殿喚绮换婵嬪炊閵娧冨Ц闁诲骸绠嶉崕鍗炍涘☉銏犲偍濞寸姴顑嗛埛鎴犵棯椤撶偞鍣烘い蹇曞█閺屾稓鈧綆鍋嗗ú鎾煏閸℃鍤囨い銏☆殜瀹曠喖顢楅崒姘疄闂備浇顕ч崙鐣屽緤閼恒儲娅犻幖杈剧悼閻挻銇勯弮鍫熸殰闁稿鎸搁埢鎾诲垂椤旂晫褰梻渚€娼荤紞鍥╃礊娓氣偓閹即顢氶埀顒€鐣烽崡鐐╂婵☆垰銈搁悰鎾绘⒒娴ｅ憡璐℃い顓炵墢閳ь剙鐏氱敮鈥崇暦椤掑嫬閱囬柡鍥╁暱閹风粯绻涙潏鍓у埌闁硅绻濆畷顖炴倷閻戞鍘搁悗鍏夊亾閻庯綆鍓涜ⅵ闁诲氦顫夊ú妯兼崲閸岀偞鍋╂繝闈涱儏缁€瀣攽閻樻彃鈧綊宕板Ο灏栧亾濞堝灝鏋涙い顓㈡敱娣囧﹪鎮滈挊澹┿劑鏌曟径鍫濆姍闁规煡绠栧濠氬磼濞嗘帒鍘＄紓渚囧櫘閸ㄨ泛顕ｆ繝姘╅柍杞拌兌閻ゅ懘姊虹捄銊ユ灁濠殿喖顕竟鏇犵磼濡偐鐦堥梻鍌氱墛缁嬫挻鏅堕姀銏㈡／?


  listen("activate-search", () => {
    // 濠电姷鏁告慨鐑藉极閹间礁纾婚柣鎰▕閻掕姤绻涢崱妯诲碍閻熸瑱绠撻幃妤呮晲鎼粹剝鐏嶉梺鍝勬媼娴滎亜顫忕紒妯诲闁告稑锕ら弳鍫ユ煢閸愵厺鍚紒杈ㄥ笧閳ь剨缍嗛崑鍛暦瀹€鍕厵妞ゆ牗顨呮禍鐐繆閻愵亜鈧洜鎹㈤幇顑炲綊宕掑В纭风秮閹煎綊宕烽鐙呯闯濠电偠鎻紞鈧い鏇熺墪閳绘捇寮埀顒勫Φ閸曨垱鏅滈柤鎭掑劤閸戔€愁渻閵堝棙纾搁柛搴ㄦ涧閻ｇ兘鎮㈢喊杈ㄦ櫖濠电偞鍨剁湁缂併劋绮欏缁樻媴娓氼垳鍔搁梺鍝勭墱閸撴盯宕氶幒鎾村劅闁靛﹤顑呭ú顓€佸▎鎾村仼鐎光偓閳ь剟顢欓弴銏♀拺闁荤喖鍋婇崵鐔兼煕鐎ｎ剙浠уù婊勬倐椤㈡﹢鎮╅悽纰夌床濠电姰鍨奸崺鏍礉閺嵮€妲堢憸鏃堝箺閸洘鏅查柛婊€鑳堕崬鐢告煟閻樿崵绱版繛鍜冪秮閹﹢鏌嗗鍡欏幗濡炪倖鎸鹃崑鐐核夐姀銈嗙厸鐎光偓鐎ｎ剙鍩屽銈庡亝缁诲牓銆佸Δ浣哥窞濠电姴鍠氶崯鈧紓鍌氬€搁崐椋庢媼閺屻儱纾婚柟鍓х帛閻撴洟鏌熼悜妯活棓婵炲牏鈧剾ce 濠电姷鏁告慨鐑藉极閹间礁纾婚柣鎰▕閻掕姤绻涢崱妯诲碍閻熸瑱绠撻幃妤呮晲鎼粹剝鐏嶉梺鍝勬媼娴滎亜顫忕紒妯诲闁告稑锕ら弳鍫ユ煢閸愵厺鍚紒杈ㄥ笧閳ь剨缍嗛崑鍛暦瀹€鍕厵妞ゆ牗顨呮禍?2 > search 濠电姷鏁告慨鐑藉极閹间礁纾婚柣鎰▕閻掕姤绻涢崱妯诲碍閻熸瑱绠撻幃妤呮晲鎼粹剝鐏嶉梺鍝勬媼娴滎亜顫忕紒妯诲闁告稑锕ら弳鍫ユ煢閸愵厺鍚紒杈ㄥ笧閳ь剨缍嗛崑鍛暦瀹€鍕厵妞ゆ牗顨呮禍?1闂?
  if (overlayStateMachine.priority >= SEARCH_PRIORITY) return;

    if (currentView === "search") {
      dismissSearch();
      capsule.classList.remove("search");
    } else {
      activateSearch();
      capsule.classList.add("search");
    }
  });

  // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偞鐗犻、鏇㈠煕濮橆厽銇濋柡浣稿暣瀹曟帒顫濇鏍ф暪闂傚倷娴囬～澶愬磿閸忓吋鍙忛柕鍫濐槸绾惧鏌ｉ弮鈧幃鑸电濠婂牊鐓涢柛鎰╁妽婢跺嫭銇勯妷銉Ч闁靛洤瀚板鎾晸閻樺弶鎳欏┑鐑囩到濞层倝鏁冮鍫涒偓浣糕槈濮楀棙鍍靛銈嗘尵閸犲酣宕滈悽鍛娾拺婵懓娲ら悞娲煕椤垵澧寸€规洘娲栭悾鐑藉炊椤垶缍楅梻浣告贡閸庛倝銆冮崱娑樼；闁瑰鍋熺粻楣冩煕閳╁喚娈樼紒鐘卞嵆閺岋繝宕遍幇顒備紙闂佸搫鏈惄顖炵嵁濮椻偓瀹曪繝鎮欏顔界秵闂傚倷娴囬鏍窗濡ゅ懏鏅濋柕蹇嬪€曠粻鏍ㄧ箾閸℃ɑ灏紒鐘垫暬閺岀喖宕崟顒夋婵炲瓨绮撶粻鏍箖瀹勬壋鏋庨煫鍥ㄦ惄娴犻箖姊洪崨濠勬噧缂佺粯锕㈠濠氭晲閸涘倻鍠庨埢搴ㄥ箚瑜庨鍕磽娴ｉ缚妾搁柛妯绘倐瀹曟垿骞樼紒妯锋嫽婵炶揪缍€濞咃絿鏁☉娆嶄簻妞ゆ挾鍋熸晶鏇㈡煃鐠囪尙效鐎殿喗鎸抽崺妤呭传閸曨剛鈹涘銈忕畱缂嶅﹪寮婚敍鍕勃閻犲洦褰冮‖鍫ユ⒑鐎圭姵顥夋い锔诲灥閻忔帞绱撻崒娆戝妽閽冮亶鎮楀顓炩枙婵﹦绮幏鍛驳鐎ｎ亝鐣伴梻浣告憸婵敻鎮у鍕彾闁哄洢鍩勯弫鍥煟閹邦剛鈻岀紓宥勭窔閻涱噣宕堕鈧痪褎绻涢崱娆忎壕缂傚秴鍊垮缁樻媴閻熼偊鍤嬬紓浣筋嚙閸婂潡鐛繝鍛杸婵炴垼椴搁弲鈺呮⒑閹肩偛鍔撮柛鎾村哺閸╂盯骞嬮敂鐣屽幈濠电偞鍨堕敃顐﹀绩婵犳碍鐓熼柟鎹愭硾閺嬫盯鏌＄仦鍓ф创鐎殿噮鍓涢幑鍕Ω瑜滈崯瀣繆閻愵亜鈧垿宕瑰ú顏呭仭闁冲搫鎳庨弰銉╂煃瑜滈崜姘跺Φ閸曨垰绠抽柛鈩冦仦婢规洟姊?
  document.addEventListener("overlay-changed", ((e: CustomEvent) => {
    if (currentView === "search" && overlayStateMachine.canPreempt(e.detail.priority as typeof SEARCH_PRIORITY, SEARCH_PRIORITY)) {
      dismissSearch();
      capsule.classList.remove("search");
    }
  }) as EventListener);

  // Async search results from backend
  listen<SearchResult[]>("search-results", (event) => {
    if (currentView === "search") {
      renderResults(event.payload);
    }
  });
}
