
const APDC_LANGS = [
  {code:"en", flag:"🇬🇧", label:"EN"},
  {code:"ko", flag:"🇰🇷", label:"한국어"},
  {code:"ja", flag:"🇯🇵", label:"日本語"},
  {code:"zh-TW", flag:"🇹🇼", label:"繁中"},
  {code:"zh-CN", flag:"🇨🇳", label:"简中"},
  {code:"ms", flag:"🇲🇾", label:"BM"}
];

const APDC_TEXT = {
  en: {
    searchPlaceholder:"Search by back number, name or section",
    search:"SEARCH", fullList:"FULL SECTION LIST", entries:"ENTRIES",
    information:"INFORMATION", venue:"VENUE & DIRECTIONS", backNo:"BACK NO.",
    competitor:"COMPETITOR / TEAM", type:"TYPE", noResults:"NO RESULTS FOUND.",
    selectJudge:"SELECT JUDGE", section:"SECTION", round:"ROUND",
    submit:"SUBMIT", submitted:"SUBMITTED", waiting:"WAITING",
    now:"NOW", onDeck:"ON DECK", next:"NEXT"
  },
  ko: {
    searchPlaceholder:"등번호, 이름 또는 종목 검색",
    search:"검색", fullList:"전체 종목 목록", entries:"명",
    information:"대회 정보", venue:"장소 및 오시는 길", backNo:"등번호",
    competitor:"선수 / 팀", type:"구분", noResults:"검색 결과가 없습니다.",
    selectJudge:"심판 선택", section:"종목", round:"라운드",
    submit:"제출", submitted:"제출 완료", waiting:"대기",
    now:"현재 경기", onDeck:"대기 경기", next:"다음 경기"
  },
  ja: {
    searchPlaceholder:"背番号・名前・セクションで検索",
    search:"検索", fullList:"全セクション", entries:"名",
    information:"大会情報", venue:"会場・アクセス", backNo:"背番号",
    competitor:"選手 / チーム", type:"区分", noResults:"検索結果がありません。",
    selectJudge:"審査員を選択", section:"セクション", round:"ラウンド",
    submit:"提出", submitted:"提出済み", waiting:"待機中",
    now:"競技中", onDeck:"待機", next:"次の競技"
  },
  "zh-TW": {
    searchPlaceholder:"依背號、姓名或組別搜尋",
    search:"搜尋", fullList:"全部組別", entries:"人",
    information:"比賽資訊", venue:"場地與交通", backNo:"背號",
    competitor:"選手 / 隊伍", type:"類別", noResults:"查無結果。",
    selectJudge:"選擇裁判", section:"組別", round:"輪次",
    submit:"提交", submitted:"已提交", waiting:"等待中",
    now:"正在進行", onDeck:"候場", next:"下一場"
  },
  "zh-CN": {
    searchPlaceholder:"按背号、姓名或组别搜索",
    search:"搜索", fullList:"全部组别", entries:"人",
    information:"比赛信息", venue:"场地与交通", backNo:"背号",
    competitor:"选手 / 队伍", type:"类别", noResults:"未找到结果。",
    selectJudge:"选择裁判", section:"组别", round:"轮次",
    submit:"提交", submitted:"已提交", waiting:"等待中",
    now:"正在进行", onDeck:"候场", next:"下一场"
  },
  ms: {
    searchPlaceholder:"Cari nombor, nama atau seksyen",
    search:"CARI", fullList:"SENARAI SEKSYEN", entries:"PESERTA",
    information:"MAKLUMAT", venue:"LOKASI & ARAH", backNo:"NO. BELAKANG",
    competitor:"PESERTA / PASUKAN", type:"JENIS", noResults:"TIADA KEPUTUSAN.",
    selectJudge:"PILIH HAKIM", section:"SEKSYEN", round:"PUSINGAN",
    submit:"HANTAR", submitted:"SUDAH DIHANTAR", waiting:"MENUNGGU",
    now:"SEKARANG", onDeck:"BERSEDIA", next:"SETERUSNYA"
  }
};

function apdcCurrentLang(){
  return localStorage.getItem("apdcLang") || "en";
}
function apdcT(key){
  const lang=apdcCurrentLang();
  return APDC_TEXT[lang]?.[key] || APDC_TEXT.en[key] || key;
}
function apdcRenderLanguageBar(targetId="languageBar"){
  const el=document.getElementById(targetId);
  if(!el)return;
  const current=apdcCurrentLang();
  el.innerHTML=APDC_LANGS.map(l=>`<button type="button" class="lang-btn ${l.code===current?"active":""}" data-lang="${l.code}" title="${l.label}"><span>${l.flag}</span><small>${l.label}</small></button>`).join("");
  el.querySelectorAll(".lang-btn").forEach(btn=>{
    btn.onclick=()=>{
      localStorage.setItem("apdcLang",btn.dataset.lang);
      location.reload();
    };
  });
}

/* Best-effort phonetic display. Original official spelling is always preserved. */
function apdcPhoneticName(name, lang=apdcCurrentLang()){
  if(lang==="en") return "";
  const exact={
    "Shen Xuan Hui":{
      ko:"선 쉬안후이", ja:"シェン・シュエンフイ",
      "zh-TW":"沈宣慧", "zh-CN":"沈宣慧", ms:"Shen Xuan Hui"
    },
    "Ng Yuen Chun":{
      ko:"응 위엔춘", ja:"ン・ユンチュン",
      "zh-TW":"吳婉珍", "zh-CN":"吴婉珍", ms:"Ng Yuen Chun"
    },
    "Wong Tsun Yin":{
      ko:"웡 쥔옌", ja:"ウォン・ツンイン",
      "zh-TW":"黃俊賢", "zh-CN":"黄俊贤", ms:"Wong Tsun Yin"
    },
    "Liu Siyan":{
      ko:"류 쓰옌", ja:"リウ・スーヤン",
      "zh-TW":"劉思妍", "zh-CN":"刘思妍", ms:"Liu Siyan"
    }
  };
  if(exact[name]?.[lang]) return exact[name][lang];

  if(lang==="ko"){
    return name
      .replace(/\bShen\b/gi,"선")
      .replace(/\bXuan\b/gi,"쉬안")
      .replace(/\bHui\b/gi,"후이")
      .replace(/\bNg\b/gi,"응")
      .replace(/\bWong\b/gi,"웡")
      .replace(/\bCheng\b/gi,"정")
      .replace(/\bChan\b/gi,"찬")
      .replace(/\bLei\b/gi,"레이")
      .replace(/\bLiu\b/gi,"류")
      .replace(/\bLin\b/gi,"린")
      .replace(/\bChen\b/gi,"천")
      .replace(/\bTsai\b/gi,"차이")
      .replace(/\bYu\b/gi,"위")
      .replace(/\bYuen\b/gi,"위엔")
      .replace(/\bChun\b/gi,"춘");
  }
  return "";
}
