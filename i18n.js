
const APDC_LANGUAGES=[
  {code:"en",flag:"🇬🇧",name:"English"},
  {code:"ko",flag:"🇰🇷",name:"한국어"},
  {code:"ja",flag:"🇯🇵",name:"日本語"},
  {code:"zh-CN",flag:"🇨🇳",name:"简体中文"},
  {code:"zh-TW",flag:"🇹🇼",name:"繁體中文"},
  {code:"zh-HK",flag:"🇭🇰",name:"繁體中文（香港）"},
  {code:"ms",flag:"🇲🇾",name:"Bahasa Melayu"}
];

const APDC_I18N={
 en:{searchPlaceholder:"Search by back number, name or section",search:"SEARCH",fullList:"FULL SECTION LIST",information:"INFORMATION",venue:"VENUE & DIRECTIONS",backNo:"BACK NO.",competitor:"COMPETITOR / TEAM",type:"TYPE",entries:"ENTRIES",selectJudge:"SELECT JUDGE",section:"SECTION",round:"ROUND",submit:"SUBMIT",submitted:"SUBMITTED",now:"NOW",onDeck:"ON DECK",next:"NEXT",language:"Language"},
 ko:{searchPlaceholder:"등번호, 이름 또는 종목 검색",search:"검색",fullList:"전체 종목 목록",information:"대회 정보",venue:"장소 및 오시는 길",backNo:"등번호",competitor:"선수 / 팀",type:"구분",entries:"명",selectJudge:"심판 선택",section:"종목",round:"라운드",submit:"제출",submitted:"제출 완료",now:"현재 경기",onDeck:"대기 경기",next:"다음 경기",language:"언어"},
 ja:{searchPlaceholder:"背番号・名前・セクションで検索",search:"検索",fullList:"全セクション",information:"大会情報",venue:"会場・アクセス",backNo:"背番号",competitor:"選手 / チーム",type:"区分",entries:"名",selectJudge:"審査員を選択",section:"セクション",round:"ラウンド",submit:"提出",submitted:"提出済み",now:"競技中",onDeck:"待機",next:"次の競技",language:"言語"},
 "zh-TW":{searchPlaceholder:"依背號、姓名或組別搜尋",search:"搜尋",fullList:"全部組別",information:"比賽資訊",venue:"場地與交通",backNo:"背號",competitor:"選手 / 隊伍",type:"類別",entries:"人",selectJudge:"選擇裁判",section:"組別",round:"輪次",submit:"提交",submitted:"已提交",now:"正在進行",onDeck:"候場",next:"下一場",language:"語言"},
 "zh-CN":{searchPlaceholder:"按背号、姓名或组别搜索",search:"搜索",fullList:"全部组别",information:"比赛信息",venue:"场地与交通",backNo:"背号",competitor:"选手 / 队伍",type:"类别",entries:"人",selectJudge:"选择裁判",section:"组别",round:"轮次",submit:"提交",submitted:"已提交",now:"正在进行",onDeck:"候场",next:"下一场",language:"语言"},
 ms:{searchPlaceholder:"Cari nombor, nama atau seksyen",search:"CARI",fullList:"SENARAI SEKSYEN",information:"MAKLUMAT",venue:"LOKASI & ARAH",backNo:"NO. BELAKANG",competitor:"PESERTA / PASUKAN",type:"JENIS",entries:"PESERTA",selectJudge:"PILIH HAKIM",section:"SEKSYEN",round:"PUSINGAN",submit:"HANTAR",submitted:"SUDAH DIHANTAR",now:"SEKARANG",onDeck:"BERSEDIA",next:"SETERUSNYA",language:"Bahasa"}
};

function apdcLang(){return localStorage.getItem("apdcLang")||"en"}
function apdcT(key){const l=apdcLang();return APDC_I18N[l]?.[key]||APDC_I18N.en[key]||key}

const APDC_NAME_GUIDE={
 "Shen Xuan Hui":{ko:"선 쉬안후이",ja:"シェン・シュエンフイ"},
 "Gerald Heng & Shen Xuan Hui":{ko:"제럴드 헹 & 선 쉬안후이",ja:"ジェラルド・ヘン & シェン・シュエンフイ"},
 "Ng Yuen Chun":{ko:"응 위엔춘",ja:"ン・ユンチュン"},
 "Ng Yuen Chun & Liu Siyan":{ko:"응 위엔춘 & 류 쓰옌",ja:"ン・ユンチュン & リウ・スーヤン"},
 "Wong Tsun Yin":{ko:"웡 췬인",ja:"ウォン・ツンイン"},
 "Wong Qinyuen & Zhu Wanyi":{ko:"웡 친위엔 & 주 완이",ja:"ウォン・チンユエン & ジュ・ワンイ"},
 "Tsai Yu Yan":{ko:"차이 위옌",ja:"ツァイ・ユイェン"},
 "Tsai Yu Tong":{ko:"차이 위퉁",ja:"ツァイ・ユートン"}
};

function apdcNameGuide(name){
 const lang=apdcLang();
 return APDC_NAME_GUIDE[name]?.[lang]||"";
}

function apdcBuildLanguageUI(){
  const host=document.getElementById("languageHost");
  if(!host)return;

  const current=APDC_LANGUAGES.find(item=>item.code===apdcLang())||APDC_LANGUAGES[0];

  host.innerHTML=`
    <button id="languageToggle" class="language-toggle" type="button"
      aria-expanded="false" aria-controls="languageMenu">
      <span class="language-globe">🌐</span>
      <span class="language-current">${current.name}</span>
      <span class="language-arrow">▼</span>
    </button>

    <div id="languageMenu" class="language-menu hidden" role="menu">
      ${APDC_LANGUAGES.map(item=>`
        <button type="button" role="menuitem" data-lang="${item.code}"
          class="${item.code===current.code?"active":""}">
          <span class="language-flag">${item.flag}</span>
          <strong>${item.name}</strong>
          ${item.code===current.code?'<span class="language-check">✓</span>':""}
        </button>
      `).join("")}
    </div>`;

  const toggle=document.getElementById("languageToggle");
  const menu=document.getElementById("languageMenu");

  function closeMenu(){
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded","false");
  }

  toggle.addEventListener("click",event=>{
    event.stopPropagation();
    const willOpen=menu.classList.contains("hidden");
    menu.classList.toggle("hidden");
    toggle.setAttribute("aria-expanded",willOpen?"true":"false");
  });

  menu.querySelectorAll("[data-lang]").forEach(button=>{
    button.addEventListener("click",()=>{
      localStorage.setItem("apdcLang",button.dataset.lang);
      location.reload();
    });
  });

  menu.addEventListener("click",event=>event.stopPropagation());
  document.addEventListener("click",closeMenu);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape")closeMenu();
  });
}


/* ===== V9 FULL PAGE TRANSLATION ===== */
const APDC_FULL_TEXT = {
  en: {
    "DASHBOARD":"DASHBOARD","JUDGE":"JUDGE","MC":"MC","LIVE":"LIVE","BROADCAST":"BROADCAST","SETTINGS":"SETTINGS",
    "EVENT":"EVENT","FLOOR":"FLOOR","SPONSORS":"SPONSORS","SYSTEM":"SYSTEM",
    "ENTER PASSWORD":"ENTER PASSWORD","ENTER":"ENTER","WRONG PASSWORD":"WRONG PASSWORD",
    "EVENT SETUP":"EVENT SETUP","EVENT MANAGEMENT":"EVENT MANAGEMENT","SECTION / EVENT":"SECTION / EVENT",
    "EVENT NO.":"EVENT NO.","ROUND":"ROUND","ASSIGNED JUDGES":"ASSIGNED JUDGES",
    "COPY PREVIOUS JUDGES":"COPY PREVIOUS JUDGES","CLEAR ALL":"CLEAR ALL",
    "SAVE ASSIGNMENT":"SAVE ASSIGNMENT","START FIRST EVENT":"START FIRST EVENT","START EVENT":"START EVENT",
    "QUARTER FINAL":"QUARTER FINAL","SEMI FINAL":"SEMI FINAL","FINAL":"FINAL",
    "JUDGES":"JUDGES","RESULT":"RESULT","IN PROGRESS":"IN PROGRESS","COMPLETE":"COMPLETE",
    "WAITING":"WAITING","SUBMITTED":"SUBMITTED","DONE":"DONE",
    "RESET ROUND":"RESET ROUND","RESET ALL SUBMISSIONS":"RESET ALL SUBMISSIONS",
    "FLOOR CONTROL":"FLOOR CONTROL","NOW":"NOW","ON DECK":"NEXT UP","NEXT":"COMING SOON",
    "PUBLISH":"PUBLISH","ADVANCE →":"ADVANCE →",
    "AUTO ADVANCE":"AUTO ADVANCE","READY":"READY","SYSTEM STATUS":"SYSTEM STATUS",
    "CONNECTED":"CONNECTED","ONLINE":"ONLINE","OPEN DASHBOARD":"OPEN DASHBOARD","OPEN MC":"OPEN MC",
    "OPEN BROADCAST":"OPEN BROADCAST","OPEN QR":"OPEN QR",
    "SPONSOR LOGOS":"SPONSOR LOGOS","BROADCAST PARTNERS":"BROADCAST PARTNERS",
    "SPONSOR NAME":"SPONSOR NAME","LOGO IMAGE URL":"LOGO IMAGE URL","ADD LOGO":"ADD LOGO","REMOVE":"REMOVE",
    "PROGRESS":"PROGRESS","EASY ENGLISH":"EASY ENGLISH","QUICK LINES":"QUICK LINES",
    "CALL PLAYERS":"CALL PLAYERS","CALL JUDGES":"CALL JUDGES","READY?":"READY?","MUSIC":"MUSIC",
    "THANK YOU":"THANK YOU","COPY":"COPY","COPIED":"COPIED",
    "WAITING FOR JUDGES":"WAITING FOR JUDGES","JUDGES ARE DONE.":"JUDGES ARE DONE.",
    "CURRENT EVENT":"CURRENT EVENT","NEXT UP":"NEXT UP","COMING SOON":"COMING SOON",
    "WITH OUR PARTNERS":"WITH OUR PARTNERS","NO ACTIVE EVENT":"NO ACTIVE EVENT",
    "NO JUDGES ASSIGNED":"NO JUDGES ASSIGNED","LAST UPDATE":"LAST UPDATE",
    "AUTO ADVANCE ON":"AUTO ADVANCE ON","AUTO ADVANCE OFF":"AUTO ADVANCE OFF",
    "PLAYER SEARCH":"PLAYER SEARCH","OPEN ENTRY SEARCH":"OPEN ENTRY SEARCH"
  },
  ko: {
    "DASHBOARD":"운영 현황","JUDGE":"심사","MC":"MC","LIVE":"선수 안내","BROADCAST":"관객 송출","SETTINGS":"설정",
    "EVENT":"경기 설정","FLOOR":"진행 관리","SPONSORS":"협찬사","SYSTEM":"시스템",
    "ENTER PASSWORD":"비밀번호 입력","ENTER":"입장","WRONG PASSWORD":"비밀번호 오류",
    "EVENT SETUP":"경기 설정","EVENT MANAGEMENT":"경기 관리","SECTION / EVENT":"종목 / 경기",
    "EVENT NO.":"이벤트 번호","ROUND":"라운드","ASSIGNED JUDGES":"배정 Judges",
    "COPY PREVIOUS JUDGES":"이전 Judges 불러오기","CLEAR ALL":"전체 해제",
    "SAVE ASSIGNMENT":"배정 저장","START FIRST EVENT":"첫 경기 시작","START EVENT":"경기 시작",
    "QUARTER FINAL":"쿼터 파이널","SEMI FINAL":"세미 파이널","FINAL":"파이널",
    "JUDGES":"Judges","RESULT":"결과","IN PROGRESS":"진행 중","COMPLETE":"완료",
    "WAITING":"대기","SUBMITTED":"제출 완료","DONE":"완료",
    "RESET ROUND":"현재 라운드 초기화","RESET ALL SUBMISSIONS":"전체 제출 초기화",
    "FLOOR CONTROL":"경기 진행","NOW":"현재 경기","ON DECK":"다음 경기","NEXT":"이후 경기",
    "PUBLISH":"송출","ADVANCE →":"다음으로 →",
    "AUTO ADVANCE":"자동 진행","READY":"준비","SYSTEM STATUS":"시스템 상태",
    "CONNECTED":"연결됨","ONLINE":"온라인","OPEN DASHBOARD":"운영 현황 열기","OPEN MC":"MC 화면 열기",
    "OPEN BROADCAST":"송출 화면 열기","OPEN QR":"QR 열기",
    "SPONSOR LOGOS":"협찬사 로고","BROADCAST PARTNERS":"송출 협찬사",
    "SPONSOR NAME":"협찬사 이름","LOGO IMAGE URL":"로고 이미지 주소","ADD LOGO":"로고 추가","REMOVE":"삭제",
    "PROGRESS":"진행률","EASY ENGLISH":"쉬운 영어","QUICK LINES":"빠른 멘트",
    "CALL PLAYERS":"선수 호출","CALL JUDGES":"Judges 호출","READY?":"준비 확인","MUSIC":"음악",
    "THANK YOU":"감사 인사","COPY":"복사","COPIED":"복사 완료",
    "WAITING FOR JUDGES":"Judges 대기","JUDGES ARE DONE.":"심사 완료",
    "CURRENT EVENT":"현재 경기","NEXT UP":"다음 경기","COMING SOON":"이후 경기",
    "WITH OUR PARTNERS":"함께하는 협찬사","NO ACTIVE EVENT":"진행 중인 경기 없음",
    "NO JUDGES ASSIGNED":"배정된 Judges 없음","LAST UPDATE":"최근 업데이트",
    "AUTO ADVANCE ON":"자동 진행 켜짐","AUTO ADVANCE OFF":"자동 진행 꺼짐",
    "PLAYER SEARCH":"선수 검색","OPEN ENTRY SEARCH":"엔트리 검색 열기"
  },
  ja: {
    "DASHBOARD":"進行状況","JUDGE":"審査","MC":"MC","LIVE":"選手案内","BROADCAST":"会場表示","SETTINGS":"設定",
    "EVENT":"競技設定","FLOOR":"進行管理","SPONSORS":"スポンサー","SYSTEM":"システム",
    "ENTER PASSWORD":"パスワード入力","ENTER":"入る","WRONG PASSWORD":"パスワードが違います",
    "EVENT SETUP":"競技設定","EVENT MANAGEMENT":"競技管理","SECTION / EVENT":"部門 / 競技",
    "EVENT NO.":"イベント番号","ROUND":"ラウンド","ASSIGNED JUDGES":"担当 Judges",
    "COPY PREVIOUS JUDGES":"前の Judges をコピー","CLEAR ALL":"すべて解除",
    "SAVE ASSIGNMENT":"割り当て保存","START FIRST EVENT":"最初の競技開始","START EVENT":"競技開始",
    "QUARTER FINAL":"準々決勝","SEMI FINAL":"準決勝","FINAL":"決勝",
    "JUDGES":"Judges","RESULT":"結果","IN PROGRESS":"進行中","COMPLETE":"完了",
    "WAITING":"待機","SUBMITTED":"提出済み","DONE":"完了",
    "RESET ROUND":"ラウンドをリセット","RESET ALL SUBMISSIONS":"全提出をリセット",
    "FLOOR CONTROL":"進行管理","NOW":"現在","ON DECK":"次","NEXT":"その次",
    "PUBLISH":"表示","ADVANCE →":"次へ →","AUTO ADVANCE":"自動進行","READY":"準備完了",
    "SYSTEM STATUS":"システム状態","CONNECTED":"接続済み","ONLINE":"オンライン",
    "OPEN DASHBOARD":"進行状況を開く","OPEN MC":"MCを開く","OPEN BROADCAST":"会場表示を開く","OPEN QR":"QRを開く",
    "SPONSOR LOGOS":"スポンサーロゴ","BROADCAST PARTNERS":"協賛企業",
    "SPONSOR NAME":"スポンサー名","LOGO IMAGE URL":"ロゴ画像URL","ADD LOGO":"ロゴ追加","REMOVE":"削除",
    "PROGRESS":"進行率","EASY ENGLISH":"やさしい英語","QUICK LINES":"クイック案内",
    "CALL PLAYERS":"選手呼び出し","CALL JUDGES":"Judges 呼び出し","READY?":"準備確認","MUSIC":"音楽",
    "THANK YOU":"お礼","COPY":"コピー","COPIED":"コピー済み",
    "WAITING FOR JUDGES":"Judges 待ち","JUDGES ARE DONE.":"審査完了",
    "CURRENT EVENT":"現在の競技","NEXT UP":"次の競技","COMING SOON":"その次",
    "WITH OUR PARTNERS":"スポンサー","NO ACTIVE EVENT":"進行中の競技なし",
    "NO JUDGES ASSIGNED":"Judges 未割当","LAST UPDATE":"最終更新",
    "AUTO ADVANCE ON":"自動進行 ON","AUTO ADVANCE OFF":"自動進行 OFF",
    "PLAYER SEARCH":"選手検索","OPEN ENTRY SEARCH":"エントリー検索を開く"
  },
  "zh-CN": {
    "DASHBOARD":"比赛总览","JUDGE":"评分","MC":"主持","LIVE":"选手提示","BROADCAST":"观众屏幕","SETTINGS":"设置",
    "EVENT":"比赛设置","FLOOR":"流程管理","SPONSORS":"赞助商","SYSTEM":"系统",
    "ENTER PASSWORD":"输入密码","ENTER":"进入","WRONG PASSWORD":"密码错误",
    "EVENT SETUP":"比赛设置","EVENT MANAGEMENT":"比赛管理","SECTION / EVENT":"组别 / 比赛",
    "EVENT NO.":"比赛编号","ROUND":"轮次","ASSIGNED JUDGES":"已分配 Judges",
    "COPY PREVIOUS JUDGES":"复制上一组 Judges","CLEAR ALL":"全部清除",
    "SAVE ASSIGNMENT":"保存分配","START FIRST EVENT":"开始第一场","START EVENT":"开始比赛",
    "QUARTER FINAL":"四分之一决赛","SEMI FINAL":"半决赛","FINAL":"决赛",
    "JUDGES":"Judges","RESULT":"结果","IN PROGRESS":"进行中","COMPLETE":"完成",
    "WAITING":"等待","SUBMITTED":"已提交","DONE":"完成",
    "RESET ROUND":"重置本轮","RESET ALL SUBMISSIONS":"重置全部提交",
    "FLOOR CONTROL":"比赛流程","NOW":"当前比赛","ON DECK":"下一场","NEXT":"之后比赛",
    "PUBLISH":"发布","ADVANCE →":"下一场 →","AUTO ADVANCE":"自动推进","READY":"准备好",
    "SYSTEM STATUS":"系统状态","CONNECTED":"已连接","ONLINE":"在线",
    "OPEN DASHBOARD":"打开总览","OPEN MC":"打开主持屏","OPEN BROADCAST":"打开观众屏","OPEN QR":"打开 QR",
    "SPONSOR LOGOS":"赞助商标志","BROADCAST PARTNERS":"合作伙伴",
    "SPONSOR NAME":"赞助商名称","LOGO IMAGE URL":"标志图片地址","ADD LOGO":"添加标志","REMOVE":"删除",
    "PROGRESS":"进度","EASY ENGLISH":"简单英语","QUICK LINES":"快捷台词",
    "CALL PLAYERS":"呼叫选手","CALL JUDGES":"呼叫 Judges","READY?":"准备确认","MUSIC":"音乐",
    "THANK YOU":"感谢","COPY":"复制","COPIED":"已复制",
    "WAITING FOR JUDGES":"等待 Judges","JUDGES ARE DONE.":"评分完成",
    "CURRENT EVENT":"当前比赛","NEXT UP":"下一场","COMING SOON":"之后比赛",
    "WITH OUR PARTNERS":"合作伙伴","NO ACTIVE EVENT":"暂无进行中的比赛",
    "NO JUDGES ASSIGNED":"未分配 Judges","LAST UPDATE":"最后更新",
    "AUTO ADVANCE ON":"自动推进开启","AUTO ADVANCE OFF":"自动推进关闭",
    "PLAYER SEARCH":"选手搜索","OPEN ENTRY SEARCH":"打开报名搜索"
  },
  "zh-TW": {
    "DASHBOARD":"賽事總覽","JUDGE":"評分","MC":"主持","LIVE":"選手提示","BROADCAST":"觀眾畫面","SETTINGS":"設定",
    "EVENT":"賽事設定","FLOOR":"流程管理","SPONSORS":"贊助商","SYSTEM":"系統",
    "ENTER PASSWORD":"輸入密碼","ENTER":"進入","WRONG PASSWORD":"密碼錯誤",
    "EVENT SETUP":"賽事設定","EVENT MANAGEMENT":"賽事管理","SECTION / EVENT":"組別 / 賽事",
    "EVENT NO.":"賽事編號","ROUND":"輪次","ASSIGNED JUDGES":"已分配 Judges",
    "COPY PREVIOUS JUDGES":"複製上一組 Judges","CLEAR ALL":"全部清除",
    "SAVE ASSIGNMENT":"儲存分配","START FIRST EVENT":"開始第一場","START EVENT":"開始賽事",
    "QUARTER FINAL":"八強賽","SEMI FINAL":"準決賽","FINAL":"決賽",
    "JUDGES":"Judges","RESULT":"結果","IN PROGRESS":"進行中","COMPLETE":"完成",
    "WAITING":"等待","SUBMITTED":"已提交","DONE":"完成",
    "RESET ROUND":"重設本輪","RESET ALL SUBMISSIONS":"重設全部提交",
    "FLOOR CONTROL":"賽事流程","NOW":"目前賽事","ON DECK":"下一場","NEXT":"之後賽事",
    "PUBLISH":"發佈","ADVANCE →":"下一場 →","AUTO ADVANCE":"自動推進","READY":"準備完成",
    "SYSTEM STATUS":"系統狀態","CONNECTED":"已連線","ONLINE":"上線",
    "OPEN DASHBOARD":"開啟總覽","OPEN MC":"開啟主持畫面","OPEN BROADCAST":"開啟觀眾畫面","OPEN QR":"開啟 QR",
    "SPONSOR LOGOS":"贊助商標誌","BROADCAST PARTNERS":"合作夥伴",
    "SPONSOR NAME":"贊助商名稱","LOGO IMAGE URL":"標誌圖片網址","ADD LOGO":"新增標誌","REMOVE":"刪除",
    "PROGRESS":"進度","EASY ENGLISH":"簡單英語","QUICK LINES":"快速台詞",
    "CALL PLAYERS":"呼叫選手","CALL JUDGES":"呼叫 Judges","READY?":"準備確認","MUSIC":"音樂",
    "THANK YOU":"致謝","COPY":"複製","COPIED":"已複製",
    "WAITING FOR JUDGES":"等待 Judges","JUDGES ARE DONE.":"評分完成",
    "CURRENT EVENT":"目前賽事","NEXT UP":"下一場","COMING SOON":"之後賽事",
    "WITH OUR PARTNERS":"合作夥伴","NO ACTIVE EVENT":"目前無進行中的賽事",
    "NO JUDGES ASSIGNED":"未分配 Judges","LAST UPDATE":"最後更新",
    "AUTO ADVANCE ON":"自動推進開啟","AUTO ADVANCE OFF":"自動推進關閉",
    "PLAYER SEARCH":"選手搜尋","OPEN ENTRY SEARCH":"開啟報名搜尋"
  },
  "zh-HK": {},
  ms: {
    "DASHBOARD":"PAPAN UTAMA","JUDGE":"PENGADILAN","MC":"MC","LIVE":"PAPARAN PEMAIN","BROADCAST":"SKRIN PENONTON","SETTINGS":"TETAPAN",
    "EVENT":"ACARA","FLOOR":"ALIRAN","SPONSORS":"PENAJA","SYSTEM":"SISTEM",
    "ENTER PASSWORD":"MASUKKAN KATA LALUAN","ENTER":"MASUK","WRONG PASSWORD":"KATA LALUAN SALAH",
    "EVENT SETUP":"TETAPAN ACARA","EVENT MANAGEMENT":"PENGURUSAN ACARA","SECTION / EVENT":"BAHAGIAN / ACARA",
    "EVENT NO.":"NO. ACARA","ROUND":"PUSINGAN","ASSIGNED JUDGES":"JUDGES DITUGASKAN",
    "COPY PREVIOUS JUDGES":"SALIN JUDGES SEBELUM","CLEAR ALL":"KOSONGKAN SEMUA",
    "SAVE ASSIGNMENT":"SIMPAN TUGASAN","START FIRST EVENT":"MULA ACARA PERTAMA","START EVENT":"MULA ACARA",
    "QUARTER FINAL":"SUKU AKHIR","SEMI FINAL":"SEPARUH AKHIR","FINAL":"AKHIR",
    "JUDGES":"JUDGES","RESULT":"KEPUTUSAN","IN PROGRESS":"SEDANG BERJALAN","COMPLETE":"SELESAI",
    "WAITING":"MENUNGGU","SUBMITTED":"SUDAH DIHANTAR","DONE":"SELESAI",
    "RESET ROUND":"TETAP SEMULA PUSINGAN","RESET ALL SUBMISSIONS":"TETAP SEMULA SEMUA HANTARAN",
    "FLOOR CONTROL":"KAWALAN ACARA","NOW":"SEKARANG","ON DECK":"SETERUSNYA","NEXT":"AKAN DATANG",
    "PUBLISH":"SIAR","ADVANCE →":"SETERUSNYA →","AUTO ADVANCE":"GERAK AUTOMATIK","READY":"SEDIA",
    "SYSTEM STATUS":"STATUS SISTEM","CONNECTED":"BERSAMBUNG","ONLINE":"DALAM TALIAN",
    "OPEN DASHBOARD":"BUKA PAPAN UTAMA","OPEN MC":"BUKA MC","OPEN BROADCAST":"BUKA SIARAN","OPEN QR":"BUKA QR",
    "SPONSOR LOGOS":"LOGO PENAJA","BROADCAST PARTNERS":"RAKAN SIARAN",
    "SPONSOR NAME":"NAMA PENAJA","LOGO IMAGE URL":"URL IMEJ LOGO","ADD LOGO":"TAMBAH LOGO","REMOVE":"BUANG",
    "PROGRESS":"KEMAJUAN","EASY ENGLISH":"BAHASA INGGERIS MUDAH","QUICK LINES":"AYAT PANTAS",
    "CALL PLAYERS":"PANGGIL PEMAIN","CALL JUDGES":"PANGGIL JUDGES","READY?":"SEDIA?","MUSIC":"MUZIK",
    "THANK YOU":"TERIMA KASIH","COPY":"SALIN","COPIED":"DISALIN",
    "WAITING FOR JUDGES":"MENUNGGU JUDGES","JUDGES ARE DONE.":"PENILAIAN SELESAI",
    "CURRENT EVENT":"ACARA SEKARANG","NEXT UP":"SETERUSNYA","COMING SOON":"AKAN DATANG",
    "WITH OUR PARTNERS":"BERSAMA RAKAN KAMI","NO ACTIVE EVENT":"TIADA ACARA AKTIF",
    "NO JUDGES ASSIGNED":"TIADA JUDGES DITUGASKAN","LAST UPDATE":"KEMAS KINI TERAKHIR",
    "AUTO ADVANCE ON":"GERAK AUTOMATIK HIDUP","AUTO ADVANCE OFF":"GERAK AUTOMATIK MATI",
    "PLAYER SEARCH":"CARI PEMAIN","OPEN ENTRY SEARCH":"BUKA CARIAN PENYERTAAN"
  }
};
APDC_FULL_TEXT["zh-HK"]=APDC_FULL_TEXT["zh-TW"];

function apdcNormalizeText(text){
  return String(text||"").replace(/\s+/g," ").trim();
}
function apdcTranslatePhrase(text){
  const lang=apdcLang();
  const normalized=apdcNormalizeText(text);
  return APDC_FULL_TEXT[lang]?.[normalized] || normalized;
}
function apdcTranslateElement(el){
  if(!el || el.dataset?.noTranslate==="true") return;

  if(el.placeholder){
    const translated=apdcTranslatePhrase(el.placeholder);
    if(translated!==el.placeholder)el.placeholder=translated;
  }

  if(["INPUT","TEXTAREA","SELECT","OPTION","SCRIPT","STYLE"].includes(el.tagName)) return;

  const childElements=[...el.children];
  if(childElements.length===0){
    const original=apdcNormalizeText(el.textContent);
    const translated=apdcTranslatePhrase(original);
    if(translated!==original)el.textContent=translated;
  }else{
    [...el.childNodes].forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE){
        const original=apdcNormalizeText(node.textContent);
        if(!original)return;
        const translated=apdcTranslatePhrase(original);
        if(translated!==original)node.textContent=node.textContent.replace(original,translated);
      }
    });
  }
}
function apdcTranslatePage(){
  document.documentElement.lang=apdcLang();
  document.querySelectorAll("body *").forEach(apdcTranslateElement);
}
document.addEventListener("DOMContentLoaded",()=>{
  apdcTranslatePage();
  const observer=new MutationObserver(mutations=>{
    mutations.forEach(mutation=>{
      mutation.addedNodes.forEach(node=>{
        if(node.nodeType===Node.ELEMENT_NODE){
          apdcTranslateElement(node);
          node.querySelectorAll?.("*").forEach(apdcTranslateElement);
        }else if(node.nodeType===Node.TEXT_NODE){
          apdcTranslateElement(node.parentElement);
        }
      });
      if(mutation.type==="characterData")apdcTranslateElement(mutation.target.parentElement);
    });
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
});
