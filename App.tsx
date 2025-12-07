import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_SCRIPT, GLOBAL_STYLE_PROMPT } from './constants';
import ComicPanel from './components/ComicPanel';
import { GenerationStatus, PanelState, ComicPanelData } from './types';

// Removed conflicting global declaration of window.aistudio to fix TypeScript errors.
// We will use type assertion (window as any).aistudio when accessing it.

// Define style presets to ensure new scripts don't get stuck with the Naruto prompt
const STYLE_PRESETS: Record<string, string> = {
  '熱血少年漫畫': "Art Style: High-quality anime screenshot, typical Shonen Jump aesthetic, cel-shaded, vibrant colors, dynamic angles, expressive characters, cinematic lighting.",
  '賽博龐克 (Cyberpunk)': "Art Style: Cyberpunk anime, Ghost in the Shell aesthetic, neon lights, futuristic city, rain, high contrast, technological overlays, purple and blue color palette.",
  '吉卜力風格 (Ghibli)': "Art Style: Studio Ghibli style, Hayao Miyazaki aesthetic, hand-painted backgrounds, lush nature, soft natural lighting, whimsical details, watercolor textures, peaceful atmosphere.",
  '黑白美漫 (Noir)': "Art Style: Noir comic style, Sin City aesthetic, high contrast black and white, heavy ink shadows, dramatic lighting, gritty texture, bold outlines.",
  '像素藝術 (Pixel Art)': "Art Style: High quality pixel art, 16-bit game aesthetic, detailed sprites, vibrant colors, retro vibe, dithered shading.",
  '水墨畫風': "Art Style: Traditional ink wash painting, Sumi-e style, artistic brush strokes, black and white with subtle color accents, atmospheric, negative space."
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [script, setScript] = useState<ComicPanelData[]>(DEFAULT_SCRIPT);
  
  // Script Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Script Generation State
  const [showScriptGen, setShowScriptGen] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genStyle, setGenStyle] = useState('熱血少年漫畫');
  const [genCount, setGenCount] = useState<number>(4);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Style State: Initialize with GLOBAL_STYLE_PROMPT (Naruto) for the default script
  const [activeStylePrompt, setActiveStylePrompt] = useState<string>(GLOBAL_STYLE_PROMPT);

  const [panelStates, setPanelStates] = useState<Record<number, PanelState>>(() => {
    const initial: Record<number, PanelState> = {};
    DEFAULT_SCRIPT.forEach(panel => {
      initial[panel.id] = { status: GenerationStatus.IDLE };
    });
    return initial;
  });
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync panelStates when script changes
  useEffect(() => {
    setPanelStates(prev => {
      const next: Record<number, PanelState> = {};
      script.forEach(panel => {
        // Preserve state if ID exists, else init
        next[panel.id] = prev[panel.id] || { status: GenerationStatus.IDLE };
      });
      return next;
    });
  }, [script]);

  // Initial Check for API Key
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && await aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleConnect = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        await aistudio.openSelectKey();
        // Assume success as per instructions
        setHasApiKey(true);
      } else {
        alert("未檢測到 Google AI Studio 環境。");
      }
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleEditClick = () => {
    setJsonInput(JSON.stringify(script, null, 2));
    setJsonError(null);
    setIsEditing(true);
  };

  const handleSaveScript = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error("腳本必須是數組格式 (Array)");
      }
      setScript(parsed);
      setIsEditing(false);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleResetScript = () => {
    if (window.confirm("確定要重置為預設範例腳本嗎？您目前的更改將會丟失。")) {
      setScript(DEFAULT_SCRIPT);
      // Reset style back to the default Naruto style
      setActiveStylePrompt(GLOBAL_STYLE_PROMPT);
      setJsonInput(JSON.stringify(DEFAULT_SCRIPT, null, 2));
      setIsEditing(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!genTopic.trim()) {
      alert("請輸入故事主題或概念");
      return;
    }

    setIsGeneratingScript(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        你是一位專業的漫畫編劇和分鏡師。
        任務：根據使用者的主題、風格和格數，產生一個結構化的漫畫劇本 JSON。
        
        輸出規則：
        1. 僅回傳純 JSON 陣列 (Array)，不要包含 markdown 標記 (如 \`\`\`json)。
        2. 語言：繁體中文 (Traditional Chinese)。
        3. 必須嚴格遵守以下 JSON 結構：
           interface ComicPanelData {
             id: number; // 1, 2, 3...
             act: string; // 例如："第一幕：起點", "第二幕：衝突"
             title: string; // 該格標題
             visualDescription: string; // 給 AI 繪圖模型的詳細視覺描述 (Visual Prompt)，包含運鏡、角色動作、背景細節。
             dialogue: { character: string; text: string; }[]; // 角色對話
             techNote?: string; // (選填) 如果有特殊技術或概念需要標註
           }
        4. 確保故事連貫，分鏡流暢。
      `;

      const prompt = `
        主題概念：${genTopic}
        漫畫風格：${genStyle}
        總格數：${genCount}
        
        請生成 JSON 劇本。
      `;

      // Use Flash for text generation logic
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
        contents: prompt
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      // Clean up markdown if present (just in case)
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedScript = JSON.parse(cleanJson);

      if (!Array.isArray(parsedScript)) {
        throw new Error("AI 生成的格式不正確 (不是 Array)");
      }

      setScript(parsedScript);
      
      // Update the active style prompt based on selection
      // This ensures we switch away from the default Naruto prompt
      if (STYLE_PRESETS[genStyle]) {
        setActiveStylePrompt(STYLE_PRESETS[genStyle]);
      } else {
        // Fallback for unexpected styles
        setActiveStylePrompt(`Art Style: ${genStyle}, high quality detailed anime style.`);
      }

      setShowScriptGen(false);
      setIsEditing(false); // Go to preview mode directly
      
      // Reset image states for new script
      setPanelStates({});

    } catch (error: any) {
      console.error("Script generation failed:", error);
      alert(`生成劇本失敗: ${error.message}`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleDownloadAll = async () => {
    const JSZip = (window as any).JSZip;
    if (!JSZip) {
      alert("下載元件尚未加載，請稍後再試。");
      return;
    }

    const zip = new JSZip();
    let count = 0;

    // Filter valid images
    script.forEach((panel) => {
      const state = panelStates[panel.id];
      if (state?.status === GenerationStatus.SUCCESS && state.imageUrl) {
        // Handle base64 data url
        const base64Data = state.imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        const filename = `panel_${panel.id.toString().padStart(2, '0')}_${panel.title.replace(/[\/\\:*?"<>|]/g, '')}.png`;
        zip.file(filename, base64Data, { base64: true });
        count++;
      }
    });

    if (count === 0) {
      alert("目前沒有已生成的圖片可供下載。請先點擊「生成所有場景」。");
      return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      
      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `comic_export_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Zip generation failed", e);
      alert("打包下載失敗");
    }
  };

  const generatePanelImage = async (panelId: number) => {
    const panel = script.find(p => p.id === panelId);
    if (!panel) return;

    // Update state to loading
    setPanelStates(prev => ({
      ...prev,
      [panelId]: { status: GenerationStatus.LOADING }
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct prompt using the ACTIVE style prompt, not the hardcoded one.
      const fullPrompt = `
        ${activeStylePrompt}
        
        Scene Description: ${panel.visualDescription}
        
        Action/Context: ${panel.dialogue.map(d => `${d.character} says: "${d.text}"`).join(" ")}
        
        Tech Visuals: ${panel.techNote ? `Visualize the concept of ${panel.techNote} creatively.` : ''}
      `;

      // Gemini 3 Pro Image Preview (Nano Banana Pro)
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        },
      });

      let imageUrl = '';
      
      // Parse response for image
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
             imageUrl = `data:image/png;base64,${base64EncodeString}`;
             break;
          }
        }
      }

      if (imageUrl) {
        setPanelStates(prev => ({
          ...prev,
          [panelId]: { status: GenerationStatus.SUCCESS, imageUrl }
        }));
      } else {
        throw new Error("No image data returned from model");
      }

    } catch (error: any) {
      console.error(`Error generating panel ${panelId}:`, error);
      let errorMessage = "生成失敗";
      if (error.message && error.message.includes("Requested entity was not found")) {
        errorMessage = "API 金鑰錯誤，請重新選擇。";
        setHasApiKey(false); // Force re-selection logic
      }
      
      setPanelStates(prev => ({
        ...prev,
        [panelId]: { status: GenerationStatus.ERROR, error: errorMessage }
      }));
    }
  };

  const generateAllPanels = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);
    abortControllerRef.current = new AbortController();

    // Sequential generation to avoid hitting concurrency limits too hard and better UX flow
    for (const panel of script) {
      if (abortControllerRef.current.signal.aborted) break;
      
      // Skip if already successful
      if (panelStates[panel.id]?.status === GenerationStatus.SUCCESS) continue;

      await generatePanelImage(panel.id);
      
      // Small delay between requests to be polite to the API
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }
    
    setIsGeneratingAll(false);
  };

  const handleRegenerateSingle = (id: number) => {
    generatePanelImage(id);
  };

  // --- Render ---

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center">
          <div className="mb-6">
             <div className="w-20 h-20 bg-orange-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-orange-500/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <h1 className="text-3xl font-bold text-white mb-2 comic-font tracking-wide">AI 漫畫生成器</h1>
             <p className="text-gray-400">使用 Gemini 3 Pro 實現您的劇本視覺化</p>
          </div>
          
          <div className="space-y-4">
             <p className="text-sm text-yellow-500 bg-yellow-900/30 p-3 rounded border border-yellow-700/50">
               ⚠️ 需要付費的 Google Cloud Project API 金鑰才能使用 Gemini 3 Pro (Nano Banana Pro) 模型。
             </p>
             <button 
               onClick={handleConnect}
               className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
             >
               <span>連結並選擇 API 金鑰</span>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
               </svg>
             </button>
             <div className="text-xs text-gray-500 mt-4">
                查看計費文件: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl comic-font text-orange-500 drop-shadow-sm hidden md:block">AI 漫畫生成器</span>
              <span className="text-2xl comic-font text-orange-500 drop-shadow-sm md:hidden">AI Comic</span>
              <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded border border-gray-700 hidden sm:inline-block">Gemini 3 Pro</span>
            </div>
            <div className="flex gap-2 sm:gap-4 items-center">
               
               {/* New Script Generator Button */}
               <button
                 onClick={() => setShowScriptGen(true)}
                 className="px-3 py-2 rounded-lg bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900 hover:text-white border border-indigo-700/50 transition-colors flex items-center gap-2 text-sm font-medium"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                 </svg>
                 <span className="hidden sm:inline">AI 產生劇本</span>
                 <span className="sm:hidden">劇本</span>
               </button>

               {/* Toggle Editor Button */}
               <button 
                 onClick={isEditing ? () => setIsEditing(false) : handleEditClick}
                 className="px-3 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm"
               >
                 {isEditing ? "返回預覽" : "編輯 JSON"}
               </button>

               {!isEditing && (
                 <>
                   <button 
                     onClick={generateAllPanels}
                     disabled={isGeneratingAll}
                     className={`
                        px-4 py-2 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 text-sm sm:text-base
                        ${isGeneratingAll 
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-orange-600 hover:bg-orange-500 text-white hover:shadow-orange-500/30'}
                     `}
                   >
                     {isGeneratingAll ? (
                       <>
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         <span className="hidden sm:inline">繪製中...</span>
                       </>
                     ) : (
                       <>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                         </svg>
                         <span className="hidden sm:inline">生成全部</span>
                         <span className="sm:hidden">生成</span>
                       </>
                     )}
                   </button>
                   
                   {/* Download Button */}
                   <button
                    onClick={handleDownloadAll}
                    className="p-2 rounded-full bg-gray-800 text-gray-400 hover:bg-green-700 hover:text-white transition-colors"
                    title="下載全部圖片 (ZIP)"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      </nav>

      {/* Script Generator Modal */}
      {showScriptGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full border border-gray-700 p-6 relative">
            <button 
              onClick={() => setShowScriptGen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-1 text-white flex items-center gap-2">
              <span className="text-indigo-400">✨</span> AI 劇本生成器
            </h2>
            <p className="text-gray-400 text-sm mb-6">輸入您的創意，讓 Gemini 為您編寫分鏡劇本。</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">故事主題 / 概念</label>
                <textarea 
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="例如：一個擁有控制時間能力的忍者，試圖拯救被摧毀的拉麵店..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">風格</label>
                  <select 
                    value={genStyle}
                    onChange={(e) => setGenStyle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="熱血少年漫畫">熱血少年漫畫 (Shonen)</option>
                    <option value="賽博龐克 (Cyberpunk)">賽博龐克 (Cyberpunk)</option>
                    <option value="吉卜力風格 (Ghibli)">吉卜力風格 (Ghibli)</option>
                    <option value="黑白美漫 (Noir)">黑白美漫 (Noir)</option>
                    <option value="像素藝術 (Pixel Art)">像素藝術 (Pixel Art)</option>
                    <option value="水墨畫風">水墨畫風</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1">格數</label>
                   <select 
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={4}>4 格 (四格漫畫)</option>
                    <option value={8}>8 格 (短篇故事)</option>
                    <option value={12}>12 格 (完整章節)</option>
                    <option value={16}>16 格 (長篇敘事)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleGenerateScript}
                  disabled={isGeneratingScript}
                  className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                    ${isGeneratingScript 
                      ? 'bg-indigo-900 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}
                  `}
                >
                  {isGeneratingScript ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      正在撰寫劇本...
                    </>
                  ) : (
                    <>
                      <span>生成劇本</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 comic-font tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
             {/* Dynamic Title based on Script, mostly decorative or use first Act */}
             {script.length > 0 && script[0].act ? script[0].act.split('：')[0] : '連續漫畫生成'}
          </h1>
          <p className="text-lg text-gray-400 font-medium">
             根據您的劇本產生連貫風格的動漫場景
          </p>
        </header>

        {isEditing ? (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">劇本編輯器 (JSON)</h2>
              <button 
                onClick={handleResetScript}
                className="text-sm text-red-400 hover:text-red-300 underline"
              >
                重置為範例劇本
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              您可以直接修改 JSON 來增減場景。如果您只想測試幾個場景，請刪除不需要的段落。
            </p>
            {jsonError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
                錯誤: {jsonError}
              </div>
            )}
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-96 bg-black text-green-400 font-mono text-sm p-4 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              spellCheck={false}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded text-gray-400 hover:text-white"
              >
                取消
              </button>
              <button 
                onClick={handleSaveScript}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
              >
                儲存並預覽
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
             {script.length === 0 ? (
               <div className="text-center text-gray-500 py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
                 <p className="text-xl mb-4">沒有場景</p>
                 <button 
                   onClick={() => setShowScriptGen(true)}
                   className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold"
                 >
                   ✨ 創建新劇本
                 </button>
               </div>
             ) : (
               script.map((panel) => (
                 <ComicPanel 
                   key={panel.id} 
                   data={panel} 
                   state={panelStates[panel.id] || { status: GenerationStatus.IDLE }} 
                   onRegenerate={handleRegenerateSingle}
                 />
               ))
             )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 text-center text-gray-600 pb-10">
          <p>Powered by Google Gemini 3 Pro Image Preview</p>
        </div>
      </main>
    </div>
  );
};

export default App;