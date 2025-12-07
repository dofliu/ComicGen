import { ComicPanelData } from './types';

// Keeping the style prompt in English usually yields better results with image models, 
// even if the rest of the prompt is in Chinese.
export const GLOBAL_STYLE_PROMPT = `
Art Style: High-quality anime screenshot, Naruto Shippuden aesthetic, cel-shaded, vibrant colors, cinematic lighting. 
Character consistency is key: 
- Tsunade: Blonde hair, pigtails, green robe, diamond mark on forehead.
- Naruto: Spiky blonde hair, orange and black jumpsuit, whisker marks.
- Sakura: Pink hair, red top, headband.
- Hinata: Dark blue hair, lavender eyes (Byakugan), gentle expression.
Setting: Konoha (Leaf Village), mix of traditional ninja architecture and modern futuristic green energy tech overlays.
`;

export const DEFAULT_SCRIPT: ComicPanelData[] = [
  // --- ACT 1 ---
  {
    id: 1,
    act: "第一幕：能源危機與資料泥沼",
    title: "S 級任務：點亮木葉！",
    techNote: "Mission Start",
    visualDescription: "仰角中景，氣勢磅礴。綱手站在火影辦公室巨大的落地窗前，窗外是需要電力的木葉村全景。她猛地拍桌子，桌上的文件飛起。鳴人、小櫻、雛田嚴肅地站在她身後。",
    dialogue: [
      { character: "綱手", text: "聽著！木葉的用電量激增！我們需要建立世界第一的『智慧風力發電廠』！這是 S 級任務！" },
      { character: "鳴人", text: "哦哦！交給我吧！我要造一個超級大的風車！" }
    ]
  },
  {
    id: 2,
    act: "第一幕：能源危機與資料泥沼",
    title: "資料的海洋 (Context Window 限制)",
    techNote: "Context Window Limit",
    visualDescription: "廣角俯拍，令人窒息的資料量。綱手打開一個巨大的地下檔案室門，裡面堆滿了幾十年的泛黃氣象卷軸、地質報告和複雜的工程藍圖。鳴人被埋在卷軸堆裡，只露出兩隻腳。",
    dialogue: [
      { character: "綱手", text: "但所有的技術資料都在這裡了...幾十年的紀錄，亂七八糟。一次性根本讀不完（Context Window 有限），找不到關鍵資訊！" },
      { character: "鳴人", text: "（悶聲）救命啊...我只想要知道風車葉片怎麼裝..." }
    ]
  },
  {
    id: 3,
    act: "第一幕：能源危機與資料泥沼",
    title: "資料結構化：怪力分類術",
    techNote: "Chunking",
    visualDescription: "動態特寫。小櫻戴上手套，眼神一凜，使出怪力，快速將一大捆卷軸「物理分類」。背景是卷軸被精準地撕成小段落，飛入標有「氣象數據」、「結構力學」、「渦輪效率」的文件夾中。",
    dialogue: [
      { character: "小櫻", text: "鳴人你這個笨蛋讓開！必須先『資料分塊 (Chunking)』！把龐大的檔案拆解成特定主題的小單元，才能管理！" }
    ]
  },
  {
    id: 4,
    act: "第一幕：能源危機與資料泥沼",
    title: "白眼！資料向量化",
    techNote: "Embedding",
    visualDescription: "特寫鏡頭，強調視覺特效。雛田開啟白眼，她的視野中，那些文字資料不再是文字，而是變成了流動的、發著藍光的能量線條和幾何圖形（代表風向、風速、壓力向量）。",
    dialogue: [
      { character: "雛田", text: "我來幫忙...用白眼進行『向量化 (Embedding)』。我能看見文字背後的數據流動，將『強風』、『微風』轉換成電腦能懂的坐標印記。" }
    ]
  },
  {
    id: 5,
    act: "第一幕：能源危機與資料泥沼",
    title: "地理資訊資料庫",
    techNote: "Vector DB",
    visualDescription: "全景，充滿科技感。三人站在一個巨大的查克拉投影地圖前，地圖上閃爍著雛田轉化出來的無數藍色數據點。小櫻正在將新的數據點登錄進去。",
    dialogue: [
      { character: "小櫻", text: "然後存入這個『地理向量資料庫』。現在，我們可以根據數據的相似度來檢索地點了。這就是 RAG (檢索增強生成) 的地基！" }
    ]
  },
  {
    id: 6,
    act: "第一幕：能源危機與資料泥沼",
    title: "語意鴻溝：拉麵風暴",
    techNote: "Semantic Gap",
    visualDescription: "搞笑的對比。左邊是鳴人興奮地問問題；右邊是系統檢索出的錯誤結果——一張一樂拉麵老闆用扇子扇拉麵的圖。",
    dialogue: [
      { character: "鳴人", text: "小櫻小櫻！快幫我找找哪裡有那種『呼呼呼超級帶勁』的風！" },
      { character: "小櫻", text: "（青筋暴露）...系統以為你在找拉麵的『吹涼風』...你的口語描述跟工程術語之間有嚴重的『語意鴻溝』啊！" }
    ]
  },
  // --- ACT 2 ---
  {
    id: 7,
    act: "第二幕：系統優化與加速",
    title: "工程師思維轉換 (HyDE)",
    techNote: "HyDE",
    visualDescription: "小櫻推眼鏡的知性特寫。她身後浮現出一個穿著工程師服裝的虛擬小櫻（代表 LLM），正在黑板上寫空氣動力學公式。",
    dialogue: [
      { character: "小櫻", text: "受不了你...啟動 HyDE！我先模擬一段專業工程師對『理想風場』的描述，用那些專業術語去資料庫搜尋，這樣才能找到真正的強風地點！" }
    ]
  },
  {
    id: 8,
    act: "第二幕：系統優化與加速",
    title: "預算的現實 (Top-K 截斷)",
    techNote: "Top-K",
    visualDescription: "雛田遺憾的表情特寫。她看著地圖上顯示了幾十個潛在的高風速紅點，但綱手丟過來的錢袋只夠蓋住其中三個點。",
    dialogue: [
      { character: "雛田", text: "雖然找到了很多好地點...但因為預算和時間限制（Top-K 截斷），綱手大人說我們只能實地勘查前三名...也許第十名的地點才是最好的呢..." }
    ]
  },
  {
    id: 9,
    act: "第二幕：系統優化與加速",
    title: "無限迴圈的提問",
    techNote: "Redundant Queries",
    visualDescription: "鳴人的搞笑大頭照。他撓著頭，一臉傻笑地重複提問。",
    dialogue: [
      { character: "鳴人", text: "吶吶，小櫻，那個渦輪機的葉片角度，到底是順時針還是逆時針轉比較好？我好像又搞混了。" }
    ]
  },
  {
    id: 10,
    act: "第二幕：系統優化與加速",
    title: "暴力快取法 (CAG / KV Cache)",
    techNote: "CAG / KV Cache",
    visualDescription: "極具衝擊力的動作畫面。小櫻忍無可忍，瞬間出現在鳴人面前，將一張寫著標準答案的巨大貼紙「啪」地一聲貼在鳴人額頭上。",
    dialogue: [
      { character: "小櫻", text: "（怒吼）這已經是你問第八次了！啟動 CAG (快取增強生成)！標準答案已經『快取』在你的額頭上了，自己照鏡子看！不准再浪費檢索資源！" }
    ]
  },
  {
    id: 11,
    act: "第二幕：系統優化與加速",
    title: "第一階段發電成功",
    techNote: "Milestone",
    visualDescription: "三人站在一座剛建好的中型風車前，風車緩緩轉動，旁邊的燈泡亮起。大家露出欣慰的笑容。",
    dialogue: [
      { character: "雛田", text: "太好了... RAG 幫我們找到了正確地點，CAG 加快了建設速度。第一台風車運轉了。" }
    ]
  },
  // --- ACT 3 ---
  {
    id: 12,
    act: "第三幕：S 級智慧電網",
    title: "真正的挑戰：智慧電網",
    techNote: "Smart Grid",
    visualDescription: "綱手再次出現，背景是整個木葉村的巨大電網模型。表情嚴肅。",
    dialogue: [
      { character: "綱手", text: "別高興得太早。一座風車不夠，我們要的是能自動應對天氣變化、自動調節的『S 級智慧電網』。光靠查資料已經不夠了。" }
    ]
  },
  {
    id: 13,
    act: "第三幕：S 級智慧電網",
    title: "工程師的直覺 (Fine-tuning)",
    techNote: "Fine-tuning",
    visualDescription: "傳承的畫面。綱手將手放在鳴人的肩膀上，她的查克拉（代表深層經驗與知識）緩緩流入鳴人體內。鳴人的眼神從迷茫變得堅定且專業。",
    dialogue: [
      { character: "綱手", text: "鳴人，我現在要對你進行 Fine-tuning (微調)。我要把幾十年的工程直覺和判斷力直接『訓練』進你的腦袋裡。以後看到風，你就要本能地知道該用什麼角度的葉片，而不只是翻書！" }
    ]
  },
  {
    id: 14,
    act: "第三幕：S 級智慧電網",
    title: "萬用儀表板 (MCP)",
    techNote: "MCP Protocol",
    visualDescription: "高科技感的廣角畫面。雛田坐在一個巨大的控制台前，面前有多個螢幕。她將一個卷軸插入接口，所有螢幕同時亮起，顯示風速計、氣象氣球、電網負載的即時數據。",
    dialogue: [
      { character: "雛田", text: "為了連接所有設備，我們啟用了 MCP (標準協議)。現在，無論是舊型的風速計還是最新的氣象衛星，都能透過這個統一接口即時傳輸數據了。" }
    ]
  },
  {
    id: 15,
    act: "第三幕：S 級智慧電網",
    title: "影分身工程隊 (Agents)",
    techNote: "Agentic AI",
    visualDescription: "熱血沸騰的建設大場面。鳴人使用了多重影分身。一個分身拿著測風儀在山頂測量，一個分身在操作起重機安裝葉片，本體拿著對講機在指揮調度。",
    dialogue: [
      { character: "鳴人/本體", text: "大家上！Agentic AI (代理模式) 啟動！一號隊去監測風向變化，二號隊根據數據調整葉片角度，三號隊平衡電網負載！我們是能自主思考、解決問題的工程隊！" }
    ]
  },
  {
    id: 16,
    act: "第三幕：S 級智慧電網",
    title: "風之谷的未來 (結局)",
    techNote: "Conclusion",
    visualDescription: "史詩般的結尾大遠景。夕陽下，木葉村周圍的山丘上矗立著無數巨大的現代化風力發電機組，整個村莊燈火通明。鳴人、小櫻、雛田、綱手站在高處俯瞰成果。天空中浮現出所有技術的關鍵字。",
    dialogue: [
      { character: "全體", text: "RAG 的精準資料、Fine-tuning 的專業直覺、Agent 的自主行動！這就是照亮木葉未來的——混合 AI 能源系統！任務完成！" }
    ]
  }
];