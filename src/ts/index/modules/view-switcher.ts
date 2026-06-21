import { invoke } from "@tauri-apps/api/core";
import type { ViewMode } from "../types";
import {
  capsule,
  currentViewContainer,
  viewHolder,
  iconPlay, iconPause,
  mpIconPlay, mpIconPause,
  vinylDisc,
  viewSwitcher, viewDots, viewElements,
} from "../dom";
import {
  isMusicPlaying,
  lyricMode,
  aiEnabled,
  emailConfigure,
  currentView, setCurrentView,
  setUserChosenView,
  isPlaying,
  setIsExpandAnimating,
  isAria2c,
} from "../state";
import { logi, logw } from "../logger";
import { getAvailablePages, resolveNextAvailablePage } from "../state-machines/page";
import { pageStateMachine } from "../state-machines/page-machine";
// ---------------------------------------------------------------------------
// 闂傚倷绀侀幉锟犳偡椤栫偛鍨傞柟鎯版閺嬩線鏌曢崼婵囧闁哥姴妫濋弻娑㈠焺閸愮偓鐣风紓浣稿€搁悧鎾诲蓟濞戙垹绠抽柟鍨暞閻ｄ粙姊洪棃娑欘棞闁哥喐鎸冲顐㈩吋婢跺﹪鏁滈梺璋庡懐澧ch 婵犵數鍋為崹鍫曞箰閸濄儳鐭撻柡澶嬪焾閸ゆ洘銇勯幒宥堝厡闁崇粯妫冮獮鏍垝閻熸澘鈷夐梺绋垮濞茬喖寮婚敐鍜佺叆閹艰揪绱曟禒鈺呮⒑閹肩偛濡肩紒缁橈耿閻涱噣骞嬮敃鈧～鍛存煟濡搫鏆辨い蹇ｅ灦閺岀喖鎮℃惔锝嗘喖濠电偠灏欓崰鏍х�?dots�?
// ---------------------------------------------------------------------------

export function getAvailableViews(): ViewMode[] {
  const views: ViewMode[] = ["time"];
  if (isMusicPlaying && lyricMode !== "off") {
    views.push("lyric");
  }
  if (aiEnabled) {
    views.push("agent");
  }
  views.push("sadb");
  if (emailConfigure) {
    views.push("email");
  }
  if (isAria2c) {
    views.push("downloader");
  }
  
  return views;
}

// ---------------------------------------------------------------------------
// 闂備礁婀遍崢褔鎮洪妸銉冩椽鎮㈤悡搴ｏ紵闁诲酣娼ч幉锟犲窗閸℃稒鐓曢柍鈺佸枤濞堟洜绱掗崒姘卞ⅵ闁哄本鐩獮鎺楀箣閻愬樊妲遍柣搴ゎ潐濞叉﹢鎮￠垾宕囨�?UI
// ---------------------------------------------------------------------------

export function updateSwitcherUI() {
  const views = getAvailableViews();

  if (views.length > 1) {
    viewSwitcher.classList.add("has-views");
  } else {
    viewSwitcher.classList.remove("has-views");
  }

  viewDots.innerHTML = "";
  views.forEach((v) => {
    const dot = document.createElement("div");
    dot.className = "view-dot" + (v === currentView ? " active" : "");
    dot.title = v === "time"
      ? "Time View"
      : v === "lyric"
        ? "Lyric View"
        : v === "agent"
          ? "Agent"
          : v === "sadb"
            ? "ADB"
            : v === "email"
              ? "Email"
              : "Downloader";
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      setUserChosenView(v);
      setView(v, true);
    });
    viewDots.appendChild(dot);
  });
}

// ---------------------------------------------------------------------------
// 闂傚倷绀侀幉锛勬暜閹烘嚚娲晝閳ь剟鎮鹃悜钘夎摕闁靛绠戝▓妤佺節閵忥絾纭鹃柨鏇樺€濆鎶芥焼瀹ュ棛鍘遍梺鍝勫€介褎淇婇崸妤佺厸?
// ---------------------------------------------------------------------------

function playSwitchPulse() {
  capsule.classList.remove("switch-pulse");
  void capsule.offsetWidth;
  capsule.classList.add("switch-pulse");
  window.setTimeout(() => {
    capsule.classList.remove("switch-pulse");
  }, 360);
}

// ---------------------------------------------------------------------------
// 闂佽娴烽弫濠氬磻婵犲啰顩查柣鎰瀹撲線鏌涢埄鍐槈缂佲偓閸℃稒鐓曢柕澶涚到婵″ジ骞栭弶鎴含闁哄本鐩獮鎺懳旀繝鍐╊吋缂傚倷鐒﹂〃鍛村箠韫囨洜鐭欏鑸靛姇閻掑灚銇勯幒鎴濃偓褰掑窗閸℃稒鐓曢柍鈺佸枤濞堟洜绱掗崒姘卞ⅵ闁哄被鍔岄埥澶娢熼悡搴毇闁诲孩顔栭崰鏍€﹀畡鎵殾婵炲棙鎸搁崣濠勨偓鐢稿亰閸ㄥ崬煤閻旈鏆﹂柨婵嗩槸缁狅絾銇勯弽銊х煂妞?
// ---------------------------------------------------------------------------

export function switchToNextView(direction: number = 1) {
  const views = getAvailableViews();
  logi("ViewSwitcher", "switchToNextView views:", views, "isMusicPlaying:", isMusicPlaying, "lyricMode:", lyricMode, "aiEnabled:", aiEnabled);
  const pageViews = getAvailablePages(views);
  if (pageViews.length < 2) return;

  const nextView = resolveNextAvailablePage(
    pageViews,
    pageStateMachine.getCurrentPage(),
    direction >= 0 ? 1 : -1,
  );

  playSwitchPulse();
  setUserChosenView(nextView);
  setView(nextView, true);
}

// ---------------------------------------------------------------------------
// 婵犳鍠楀畷鍧楀川椤撳缍侀弻锝夊冀閻㈤潧鍩屽銈庡幑閸斿矂锝炲┑鍡欐殾闁搞儯鍔庨埀顒夊弮濮婃椽宕ㄦ繝鍌滅懆濠电偠顕滅粻鎴︽偩閻戣姤鍤戞い鎺嶇閺嬪倿姊虹化鏇炲⒉妞ゃ劌妫涚�?
// ---------------------------------------------------------------------------

viewSwitcher.addEventListener("wheel", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.deltaY > 0) {
    switchToNextView(1);
  } else {
    switchToNextView(-1);
  }
}, { passive: false });

// ---------------------------------------------------------------------------
// DOM 闂傚倷绀佸﹢閬嶅煕閸儱绀堟繝闈涚墛瀹曡尙鈧箍鍎遍ˇ浼村疾椤掍焦鍙忔慨妤€妫楁晶鐗堢箾閸垹鍔嬬紒缁樼洴瀹曪絾寰勭€ｅ灚鍋ョ紓鍌欑閻牓宕滃☉銏犵疅闁圭虎鍠栭獮銏′繆閵堝嫯鍏屾い鈺婂幘缁辨挻鎷呴崜鍙壭銈嗘肠閸パ呯厬?#current-view闂傚倷鐒︾€笛呯矙閹达附鍤愭い鏍仜閻鏌ｉ幇闈涘濠殿垰鐡ㄧ换娑㈠幢濡ゅ啰顔夌紓浣插亾闁逞屽墴濮婃椽宕崟顒夋！闂侀潧娲ㄩ崑鐔煎�?
// ---------------------------------------------------------------------------

function mountView(mode: ViewMode) {
  // 闂傚倷鑳堕、濠傗枖濞戙垺鏅濋柕鍫濇川缁€濠囨倵閿濆骸鏋涚紒鈧崼鈶╁亾楠炲灝鍔氶柟宄邦儔瀹曨垶宕堕浣哄幈闂佹寧绻傞崯顐ｆ叏閸岀偞鐓曢柨婵嗘搐閸樻挳鏌熼姘殻鐎规洜鍠栭、鏇㈠Χ閸℃ê鏆嶉梻鍌欒兌椤牏鎹㈤幇鏉跨柈闁规鍠氶惌鍡欌偓鍏夊亾闁告洦鍋嗛鎰渻閵堝棗鍧婇柛瀣尰缁绘盯宕ｆ径灞解拰閻庢鍠栭崯鍧椻€旈崘顔肩鐟滃海浜?
  while (currentViewContainer.firstChild) {
    viewHolder.appendChild(currentViewContainer.firstChild);
  }
  // 闂傚倷鑳堕、濠傗枖濞戙垺鏅濋柨鏇楀亾閻撱倕霉閸忓吋缍戦柛鎰ㄥ亾闂備焦鎮堕崕鐑樼鐠轰警鐒介柟鐑橆殕閻撴洟鏌曟径娑氱暠闁告柣鍊濋弻娑樜熺紒妯烘殫濠碘€冲级閸旀瑩骞冮埡鍛優妞ゆ劑鍨规竟搴ㄦ⒒娴ｄ警鐒剧紒璇茬墦瀹曟洟鏌嗗搴㈡櫓闂佸湱澧楀姗€姊?
  const el = viewElements[mode];
  if (el) {
    currentViewContainer.appendChild(el);
    // �?display:none 闂備浇顕ф绋匡耿闁秴绠犻柟鐐灱閺嬪秹鏌熼悜妯烩拻闁活厽鎹囬幃褰掑炊閵娿儳绁峰┑顕嗙到椤︾敻寮诲☉姗嗘僵妞ゆ帒瀚烽埀顒侇殘閳ь剝顫夐幃鍌涚鐠鸿櫣鏆︽慨妯挎硾闁卞洭鏌￠崶鈺佷沪妞ゅ繒鍠撶槐鎾存媴閸濆嫅锝嗐亜閵娿儲顥㈤柟顔ㄥ洤纭€闁绘垵妫楀�?
    el.style.display = "flex";
  }
}

// ---------------------------------------------------------------------------
// 闂傚倷绀侀幖顐﹀疮閻楀牊鍙忛悗娑櫳戦崣蹇涙煃閸濆嫭鍣洪柛瀣ㄥ姂閹綊宕堕妸銉хシ闂佽楠搁妶鎼佸蓟閻旂儤瀚氶柍鈺佸暟缁愭瑧绱撴担浠嬪摵闁荤啿鏅涢悾宄邦潩椤戣姤鏂€闂佺硶妾ч弲婊呯礊韫囨稒�?/ 闂佽瀛╅鏍窗閺嶎厼绠规い鎰剁畱閺勩儲淇婇妶鍛殲鐎规洖顦甸幃妤呭捶椤撶倫锝囩磼娓氬洤娅嶉柡?
// ---------------------------------------------------------------------------

export function showOnlyView(mode: ViewMode) {
  // 闂傚倷绀侀幉锟犳偡閿曞倹鍋嬫俊銈呭暟閻捇鏌ｉ幋锝嗩棄缂佺姰鍎甸弻宥堫檨闁告挾鍠庨锝夊垂椤愩垻绐為柟鍏兼儗閸犳绱炴繝鍥ㄢ拺闁硅偐鍋涢崝姘辨喐閹殿喖浠х紒顕呭弮瀹曟帒顫濋敐鍡欎簴闂佽鍑界紞鍡涘礈濮橆兘鏋旂€光偓閸曨剛鍘介梺闈涱焾閸庨亶顢旈埡浣叉斀妞ゆ棁顫夊▍濠囨�?
  (Object.keys(viewElements) as ViewMode[]).forEach((v) => {
    const el = viewElements[v];
    el.getAnimations().forEach((a) => a.cancel());
    el.style.opacity = "";
    el.style.transform = "";
  });
  mountView(mode);
}

// ---------------------------------------------------------------------------
// 闂備焦鐪归崺鍕垂閻ｅ瞼涓嶉柟瀵稿仦閸欏繘鏌嶉崫鍕櫤闁稿鍔戦幃褰掑炊閵娿儳绁烽梺璇查閵堟悂�?
// ---------------------------------------------------------------------------

function animateViewSwitch(from: ViewMode, to: ViewMode) {
  if (from === to) {
    showOnlyView(to);
    return;
  }

  const fromEl = viewElements[from];
  const toEl = viewElements[to];

  // 闂傚倷鑳堕…鍫㈡崲閹扮増鍋嬪┑鐘插暕缁诲棝鏌熼梻瀵割槮缂侇偄绉堕幉鎼佸箣閿旇偐绋忛柣搴秵閸犳牠鎮欐繝鍥ㄧ厽闁逛即娼ф晶鑼磼閹邦収娈滈�?
  if (fromEl && fromEl.parentElement === currentViewContainer) {
    fromEl.getAnimations().forEach((a) => a.cancel());
    const outAnim = fromEl.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-8px) scale(0.985)" },
      ],
      { duration: 160, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    outAnim.onfinish = () => {
      fromEl.style.opacity = "";
      fromEl.style.transform = "";
      // 闂傚倷绀佸﹢閬嶅煕閸儱绀堟繛鍡楃贩濞差亜鍐€妞ゆ挾鍋炴潏鍫濃攽閿涘嫬浠滃褑妫勯�?
      if (fromEl.parentElement === currentViewContainer) {
        viewHolder.appendChild(fromEl);
      }
    };
  }

  // 闂傚倷绀侀幖顐﹀磹鐟欏嫬鍨斿ù鐘差儜缂嶆牠鎮楅敐搴℃灈闁绘劕锕弻锝夊箛闂堟稑顫╅梺浼欏瘜閸ㄥ爼寮诲☉婊呯杸閻庯綆浜滄慨搴☆渻閵堝棙鈷愰柛鏃€鐟ラ悾鐑藉箮閽樺）鈺呮煏婢跺牆濡奸柣婵愬灠閳规垿鎮滈崶鈺佺煗闂侀€炲苯澧柛鐔风仢�?
  if (toEl.parentElement !== currentViewContainer) {
    currentViewContainer.appendChild(toEl);
    toEl.style.display = "flex";
  }
  toEl.getAnimations().forEach((a) => a.cancel());
  const inAnim = toEl.animate(
    [
      { opacity: 0, transform: "translateY(8px) scale(0.985)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    { duration: 230, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" },
  );
  inAnim.onfinish = () => {
    if (currentView === to) {
      toEl.style.opacity = "";
      toEl.style.transform = "";
    }
  };
}
export function updateCapsuleSize() {
  const page = pageStateMachine.getCurrentPage();
  pageStateMachine.substates[page]?.applyPageClasses(capsule.classList);
}

// ---------------------------------------------------------------------------
// 缂傚倸鍊搁崐鐑芥嚄閸洖绐楃€广儱娲ㄩ崡姘舵煙缂併垹鏋涚紒鈧崒鐐寸厪濠㈣泛鐗嗛崝姘辩磽瀹ュ棙宕岄柡灞诲妼閳藉鈻庨幒鎴濠电姭鎷冮崨顓夈儳绱掗瑙勬珚妞ゃ垺绋戦湁闁靛牆瀚粣鏃傗偓瑙勬礈椤牐鐏冮梺鍛婃处閸樹粙顢欏澶嬧�?
// ---------------------------------------------------------------------------

export function setView(mode: ViewMode, animated = true) {
  const previous = currentView;//闂傚倸顭崑鍕归崒鐐茬；闁糕剝绋戦�?
  setCurrentView(mode);
  // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍓﹀ù?agent 闂備浇顕х换鎺楀磻閻愯娲冀椤愶綆娼熼梺纭呮彧缁犳垹绮婚幋婢濆綊鏁愰崶鍓佸姼闂佽楠搁妶鎼佸箖绾拋妲婚柟鐓庣摠缁骸危閹邦兘鏀介悗锝庝簽閸濇姊虹拠鈥崇仯濠⒀勵殔閻ｇ兘鎼归顐ｎ啍闂佺粯鍔樺▔娑㈡偂閹邦優褰掓偑閳ь剟宕板Δ鈧銉╁礋椤愵偄鎮戦梺鎼炲劗閺呮盯鎮欐繝鍥ㄢ拺闁告稑锕﹂幊鏇犵磼闊厾鐭欏┑锛勬暬瀹曞爼鍩￠埀顒勬�?
  if (previous === "agent" && mode !== "agent" && capsule.classList.contains("agent-expanded")) {
    capsule.classList.remove("agent-expanded");
    window.setTimeout(() => {
      void invoke("set_expanded", { expanded: false });
    }, 100);
  }

  // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍓﹀ù?lyric 闂備浇顕х换鎺楀磻閻愯娲冀椤愶綆娼熼梺纭呮彧缁犳垹绮婚幋婢濆綊鏁愰崶鍓佸姼闂佽楠搁妶鎼佸箖绾拋妲婚柟鐓庣摠缁骸危閹邦兘鏀介悗锝庝簽閸濇姊虹拠鈥崇仯濠⒀勵殔�?
  if (previous === "lyric" && mode !== "lyric" && capsule.classList.contains("music-expanded")) {
    setIsExpandAnimating(false);
    capsule.classList.remove("music-expanded");
    void invoke("set_expanded", { expanded: false });
  }

  // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍓﹀ù?sadb 闂傚倷绀侀幉锛勬暜閹烘嚚娲煛閸涱喗鍟掗柣搴秵閸犳寮查鍌楀亾閸忓浜鹃梺閫炲苯澧伴柛鎺撳浮楠炴﹢骞囨担瑙勩€冮梻渚€娼х换鍫ュ磹閺嵮€鏋旈柡鍐ㄧ墛閻撴洜鈧箍鍎遍幊鎰不娴煎瓨鐓犻柤濮愬€曢弸搴ㄦ煏閸℃ê娴€规洏鍔戦、娑樷槈濡嘲浜鹃柣鎰劋閻撴瑧鐥悧鍩亝绂嶆ィ鍐┾拺?sadb �?
  if (previous === "sadb" && mode !== "sadb") {
    void invoke("sadb_stop_mirroring");
    if (capsule.classList.contains("sadb-expanded")) {
      capsule.classList.remove("sadb-expanded");
      void invoke("set_expanded", { expanded: false });
    }
    if (capsule.classList.contains("sadb-idle")) {
      capsule.classList.remove("sadb-idle");
      // 闂傚倷绀侀幉锟犳嚌閹灐褰掓倻缁涘鏅滃銈嗗笒鐎氼剛绮堟径鎰厪濠电倯鍐仾婵絽閰ｅ娲箹閻愭彃濮㈤梺绋款儍閸婃宕氶幒妤婃晬婵犲﹤瀚娑㈡⒑闂堟稓澧曢柟鍐茬箰鍗遍柍褜鍓熼弻锝嗘償閿濆棙姣勫銈庡幖閻楁捇骞?snap 闂傚倷鐒﹂幃鍫曞磿閹惰棄纾婚柕鍫濐槸杩濇繝鐢靛Т濞诧箓�?
      window.setTimeout(() => {
        void invoke("sadb_set_idle", { idle: false });
      }, 200);
    }
  }

  // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍓﹀ù鍕煙閸忚偐鏆橀柛銊︽そ瀹曟垵鈹戦崼銏紲婵炴挻鑹鹃悘婵嬫倶閳哄懏鐓曢柕濞垮劤缁犳娊鏌熺粔鍡楁噺閺嗘粍銇勯弬鍨挃妞わ富鍠栭埞鎴︽倷鐎涙ê纰嶉梺纭呮珪閸旀瑩鐛崘鈺冪瘈闁搞儜鍜佸晣婵犵數濮撮敃銈夊箠鎼淬劌纾荤€广儱顦伴悡?class
  if (previous === "search" && mode !== "search") {
    capsule.classList.remove("search-active", "search-expanded");
  }

  if (previous === "email" && mode !== "email" && capsule.classList.contains("email-expanded")) {
    capsule.classList.remove("email-expanded");
    void invoke("set_expanded", { expanded: false });
  }

  if (previous === "downloader" && mode !== "downloader" && capsule.classList.contains("downloader-expanded")) {
    capsule.classList.remove("downloader-expanded");
    void invoke("set_expanded", { expanded: false });
  }

  
  if (animated) {
    animateViewSwitch(previous, mode);
  } else {
    showOnlyView(mode);
  }
  syncCurrentView(mode);
  updateCapsuleSize();
  updateSwitcherUI();
}

// ---------------------------------------------------------------------------
// 闂傚倷绀侀幉锟犳嚌閹灐褰掓倻缁涘鏅滃銈嗗笒鐎氼剛鎲撮敃鍌涘€堕柣鎰祷濡炬悂鏌?
// ---------------------------------------------------------------------------

export function syncCurrentView(mode: ViewMode) {
  return invoke("set_current_view", { view: mode }).catch((e) => {
    logw("sync current view failed:", e);
  });
}

// ---------------------------------------------------------------------------
// 闂傚倷绀佸﹢閬嶆惞鎼淬劌鍌ㄥù鐘差儏濡ê銆掑锝呬壕閻庤娲栭悥濂稿箖濞嗘搩鏁嗛柛灞炬皑娴煎洭姊绘担鍛婂暈闁煎綊绠栧鐢割敆閸曞灚�?
// ---------------------------------------------------------------------------

export function updatePlayIcon() {
  iconPlay.style.display = isPlaying ? "none" : "block";
  iconPause.style.display = isPlaying ? "block" : "none";

  // 闂傚倸鍊搁崐鎼佹偋閸曨垰鍨傞柛婵嗗閻斿棙鎱ㄥ璇蹭壕濡ょ姷鍋為敃銏ゃ€佸鈧幃銏ゅ川婵犲啰鐣梻鍌欑劍閹爼宕曢幎钘夌；闁瑰墽绮崑澶愭煥濠靛棭妲搁悷娆欑畵閹﹢鎮欐担鍐╊€楅�?
  mpIconPlay.style.display = isPlaying ? "none" : "block";
  mpIconPause.style.display = isPlaying ? "block" : "none";

  if (isPlaying) {
    vinylDisc.classList.remove("paused");
  } else {
    vinylDisc.classList.add("paused");
  }
}
