
const APDC_LANGUAGES=[
 {code:"en",flag:"🇬🇧",name:"English"},
 {code:"ko",flag:"🇰🇷",name:"한국어"},
 {code:"ja",flag:"🇯🇵",name:"日本語"},
 {code:"zh-TW",flag:"🇹🇼",name:"繁體中文"},
 {code:"zh-CN",flag:"🇨🇳",name:"简体中文"},
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
 const current=APDC_LANGUAGES.find(x=>x.code===apdcLang())||APDC_LANGUAGES[0];
 host.innerHTML=`
   <button id="languageToggle" class="language-toggle" type="button" aria-label="${apdcT("language")}">
     <span>🌐</span><small>${current.flag}</small>
   </button>
   <div id="languageMenu" class="language-menu hidden">
     ${APDC_LANGUAGES.map(l=>`<button type="button" data-lang="${l.code}" class="${l.code===current.code?"active":""}"><span>${l.flag}</span><strong>${l.name}</strong></button>`).join("")}
   </div>`;
 const toggle=document.getElementById("languageToggle");
 const menu=document.getElementById("languageMenu");
 toggle.onclick=e=>{e.stopPropagation();menu.classList.toggle("hidden")};
 menu.querySelectorAll("button").forEach(b=>b.onclick=()=>{
   localStorage.setItem("apdcLang",b.dataset.lang);
   location.reload();
 });
 document.addEventListener("click",()=>menu.classList.add("hidden"));
 menu.onclick=e=>e.stopPropagation();
}
