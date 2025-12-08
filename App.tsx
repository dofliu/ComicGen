
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_SCRIPT, GLOBAL_STYLE_PROMPT } from './constants';
import ComicPanel from './components/ComicPanel';
import { GenerationStatus, PanelState, ComicPanelData, ModelId, AppSettings } from './types';

// Define style presets to ensure new scripts don't get stuck with the Naruto prompt
const STYLE_PRESETS: Record<string, string> = {
  '熱血少年漫畫': "Art Style: High-quality anime screenshot, typical Shonen Jump aesthetic, cel-shaded, vibrant colors, dynamic angles, expressive characters, cinematic lighting.",
  '賽博龐克 (Cyberpunk)': "Art Style: Cyberpunk anime, Ghost in the Shell aesthetic, neon lights, futuristic city, rain, high contrast, technological overlays, purple and blue color palette.",
  '吉卜力風格 (Ghibli)': "Art Style: Studio Ghibli style, Hayao Miyazaki aesthetic, hand-painted backgrounds, lush nature, soft natural lighting, whimsical details, watercolor textures, peaceful atmosphere.",
  '黑白美漫 (Noir)': "Art Style: Noir comic style, Sin City aesthetic, high contrast black and white, heavy ink shadows, dramatic lighting, gritty texture, bold outlines.",
  '像素藝術 (Pixel Art)': "Art Style: High quality pixel art, 16-bit game aesthetic, detailed sprites, vibrant colors, retro vibe, dithered shading.",
  '水墨畫風': "Art Style: Traditional ink wash painting, Sumi-e style, artistic brush strokes, black and white with subtle color accents, atmospheric, negative space."
};

const MODELS: { id: ModelId; name: string; provider: 'google' | 'openai' }[] = [
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro (Nano Banana Pro)', provider: 'google' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', provider: 'google' },
  { id: 'imagen-3.0-generate-001', name: 'Imagen 3', provider: 'google' },
  { id: 'gpt-image-1', name: 'GPT Image 1', provider: 'openai' },
];

const App: React.FC = () => {
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    googleApiKey: '',
    openaiApiKey: '',
    selectedModel: 'gemini-3-pro-image-preview',
  });
  const [showSettings, setShowSettings] = useState(false);

  // App State
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

  // Style State
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
        next[panel.id] = prev[panel.id] || { status: GenerationStatus.IDLE };
      });
      return next;
    });
  }, [script]);

  // Initial Check for Google API Key from Environment/AI Studio
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && await aistudio.hasSelectedApiKey()) {
        // We don't have direct access to the key string via hasSelectedApiKey,
        // but the SDK will pick it up from process.env.API_KEY if injected.
        // For manual input, we leave it empty here and let the user fill it if needed.
        // However, to make the UI "ready", we can assume if hasSelectedApiKey is true,
        // we might not need to force prompt. But for this multi-model app, 
        // we prefer explicit keys in settings or env.
        
        // If process.env.API_KEY is available (injected by idx/studio), use it
        if (process.env.API_KEY) {
           setSettings(prev => ({ ...prev, googleApiKey: process.env.API_KEY! }));
        }
      } else {
        // Show settings on first load if no keys are likely present
        if (!process.env.API_KEY) {
            setShowSettings(true);
        }
      }
    };
    checkKey();
  }, []);

  const handleGoogleConnect = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        await aistudio.openSelectKey();
        // After selection, the key is typically injected into the environment or handled by the proxy.
        // We might need to refresh to get the key or just assume it works for the SDK.
        if (process.env.API_KEY) {
             setSettings(prev => ({ ...prev, googleApiKey: process.env.API_KEY! }));
        }
      } else {
        alert("未檢測到 Google AI Studio 環境。請直接輸入 API Key。");
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
      setActiveStylePrompt(GLOBAL_STYLE_PROMPT);
      setJsonInput(JSON.stringify(DEFAULT_SCRIPT, null, 2));
      setIsEditing(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!settings.googleApiKey && !process.env.API_KEY) {
        alert("生成劇本需要 Google API Key (Gemini Flash)。請先在設定中輸入。");
        setShowSettings(true);
        return;
    }

    if (!genTopic.trim()) {
      alert("請輸入故事主題或概念");
      return;
    }

    setIsGeneratingScript(true);
    try {
      const apiKey = settings.googleApiKey || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const systemInstruction = `
        你是一位專業的漫畫編劇和分鏡師。
        任務：根據使用者的主題、風格和格數，產生一個結構化的漫畫劇本 JSON。
        
        輸出規則：
        1. 僅回傳純 JSON 陣列 (Array)，不要包含 markdown 標記。
        2. 語言：繁體中文。
        3. JSON 結構：
           interface ComicPanelData {
             id: number;
             act: string;
             title: string;
             visualDescription: string;
             dialogue: { character: string; text: string; }[];
             techNote?: string;
           }
      `;

      const prompt = `主題：${genTopic}\n風格：${genStyle}\n格數：${genCount}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { systemInstruction, temperature: 0.7 },
        contents: prompt
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedScript = JSON.parse(cleanJson);

      if (!Array.isArray(parsedScript)) throw new Error("Format Error");

      setScript(parsedScript);
      
      if (STYLE_PRESETS[genStyle]) {
        setActiveStylePrompt(STYLE_PRESETS[genStyle]);
      } else {
        setActiveStylePrompt(`Art Style: ${genStyle}, high quality detailed anime style.`);
      }

      setShowScriptGen(false);
      setIsEditing(false); 
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
      alert("下載元件尚未加載。");
      return;
    }
    const zip = new JSZip();
    let count = 0;

    const promises = script.map(async (panel) => {
      const state = panelStates[panel.id];
      if (state?.status === GenerationStatus.SUCCESS && state.imageUrl) {
        const filename = `panel_${panel.id.toString().padStart(2, '0')}.png`;
        
        if (state.imageUrl.startsWith('http')) {
            try {
                // Fetch remote image (for OpenAI URLs)
                const response = await fetch(state.imageUrl);
                const blob = await response.blob();
                zip.file(filename, blob);
                count++;
            } catch (e) {
                console.error(`Failed to download image for panel ${panel.id}`, e);
            }
        } else {
            // Handle Base64 Data URI
            const base64Data = state.imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            zip.file(filename, base64Data, { base64: true });
            count++;
        }
      }
    });

    await Promise.all(promises);

    if (count === 0) {
      alert("沒有可下載的圖片。");
      return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `comic_export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("下載失敗");
    }
  };

  const generatePanelImage = async (panelId: number) => {
    const panel = script.find(p => p.id === panelId);
    if (!panel) return;

    // Check Keys
    const currentModel = MODELS.find(m => m.id === settings.selectedModel);
    if (currentModel?.provider === 'google' && !settings.googleApiKey && !process.env.API_KEY) {
        alert("請輸入 Google API Key");
        setShowSettings(true);
        return;
    }
    if (currentModel?.provider === 'openai' && !settings.openaiApiKey) {
        alert("請輸入 OpenAI API Key");
        setShowSettings(true);
        return;
    }

    setPanelStates(prev => ({
      ...prev,
      [panelId]: { status: GenerationStatus.LOADING }
    }));

    try {
        const fullPrompt = `
        ${activeStylePrompt}
        Scene Description: ${panel.visualDescription}
        Action/Context: ${panel.dialogue.map(d => `${d.character} says: "${d.text}"`).join(" ")}
        `;

        let imageUrl = '';

        if (currentModel?.provider === 'google') {
            const apiKey = settings.googleApiKey || process.env.API_KEY;
            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            if (settings.selectedModel === 'imagen-3.0-generate-001') {
                // Imagen Logic
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001', // Use 4.0 as per new guide, despite ID name
                    prompt: fullPrompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: '16:9',
                        outputMimeType: 'image/jpeg'
                    }
                });
                const b64 = response.generatedImages?.[0]?.image?.imageBytes;
                if(b64) imageUrl = `data:image/jpeg;base64,${b64}`;
            } else {
                // Nano Banana / Gemini Logic
                const response = await ai.models.generateContent({
                    model: settings.selectedModel,
                    contents: { parts: [{ text: fullPrompt }] },
                    config: {
                         // Only add imageConfig for the Pro model which supports it
                         imageConfig: settings.selectedModel === 'gemini-3-pro-image-preview' 
                             ? { aspectRatio: "16:9", imageSize: "1K" } 
                             : undefined
                    },
                });
                
                // Extract Image
                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
        } else if (currentModel?.provider === 'openai') {
            // OpenAI / GPT Image Logic
            const res = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${settings.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: settings.selectedModel, // Dynamic model selection (e.g., 'gpt-image-1')
                    prompt: fullPrompt,
                    n: 1,
                    size: "1024x1024"
                    // response_format removed to fix "Unknown parameter" error
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            
            // Handle standard URL response
            if (data.data?.[0]?.url) {
                imageUrl = data.data[0].url;
            } else if (data.data?.[0]?.b64_json) {
                // Fallback just in case
                imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
            }
        }

        if (imageUrl) {
            setPanelStates(prev => ({
                ...prev,
                [panelId]: { status: GenerationStatus.SUCCESS, imageUrl }
            }));
        } else {
            throw new Error("模型未返回圖像數據");
        }

    } catch (error: any) {
      console.error(`Panel ${panelId} error:`, error);
      setPanelStates(prev => ({
        ...prev,
        [panelId]: { status: GenerationStatus.ERROR, error: error.message || "生成失敗" }
      }));
    }
  };

  const generateAllPanels = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);
    abortControllerRef.current = new AbortController();

    for (const panel of script) {
      if (abortControllerRef.current.signal.aborted) break;
      if (panelStates[panel.id]?.status === GenerationStatus.SUCCESS) continue;
      await generatePanelImage(panel.id);
      // Wait a bit to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, settings.selectedModel === 'gpt-image-1' ? 2000 : 1000));
    }
    setIsGeneratingAll(false);
  };

  const handleRegenerateSingle = (id: number) => {
    generatePanelImage(id);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl comic-font text-orange-500 drop-shadow-sm hidden md:block">AI 漫畫生成器</span>
              <span className="text-xl comic-font text-orange-500 md:hidden">AI Comic</span>
              <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded border border-gray-700 hidden sm:inline-block">
                {MODELS.find(m => m.id === settings.selectedModel)?.name}
              </span>
            </div>
            
            <div className="flex gap-2 sm:gap-4 items-center">
                <button
                 onClick={() => setShowSettings(true)}
                 className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white border border-gray-700 hover:bg-gray-700 transition-colors"
                 title="設定 API 與 模型"
                >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                 </svg>
               </button>

               <button
                 onClick={() => setShowScriptGen(true)}
                 className="px-3 py-2 rounded-lg bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900 hover:text-white border border-indigo-700/50 transition-colors flex items-center gap-2 text-sm font-medium"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                 </svg>
                 <span className="hidden sm:inline">AI 劇本</span>
               </button>

               <button 
                 onClick={isEditing ? () => setIsEditing(false) : handleEditClick}
                 className="px-3 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm"
               >
                 {isEditing ? "預覽" : "JSON"}
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
                       </>
                     )}
                   </button>
                   
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full border border-gray-700 p-6 relative">
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                 <span>⚙️</span> 設定
              </h2>

              <div className="space-y-6">
                 {/* Model Selection */}
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">選擇繪圖模型</label>
                    <select
                      value={settings.selectedModel}
                      onChange={(e) => setSettings({...settings, selectedModel: e.target.value as ModelId})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500"
                    >
                       {MODELS.map(m => (
                         <option key={m.id} value={m.id}>{m.name}</option>
                       ))}
                    </select>
                 </div>

                 {/* API Keys */}
                 <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">API 金鑰設定</h3>
                    
                    {/* Google Key */}
                    <div className="mb-4">
                       <label className="block text-xs text-gray-500 mb-1">Google API Key (Gemini / Imagen)</label>
                       <div className="flex gap-2">
                          <input 
                            type="password"
                            placeholder="輸入 Google API Key..."
                            value={settings.googleApiKey}
                            onChange={(e) => setSettings({...settings, googleApiKey: e.target.value})}
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm"
                          />
                          <button onClick={handleGoogleConnect} className="px-3 py-1 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-700 hover:bg-blue-800">
                             AI Studio
                          </button>
                       </div>
                    </div>

                    {/* OpenAI Key */}
                    <div>
                       <label className="block text-xs text-gray-500 mb-1">OpenAI API Key (GPT Image)</label>
                       <input 
                         type="password"
                         placeholder="sk-..."
                         value={settings.openaiApiKey}
                         onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
                         className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm"
                       />
                    </div>
                 </div>

                 <div className="pt-2">
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"
                    >
                      完成設定
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

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
                    {Object.keys(STYLE_PRESETS).map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-300 mb-1">格數</label>
                   <select 
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={4}>4 格</option>
                    <option value={8}>8 格</option>
                    <option value={12}>12 格</option>
                    <option value={16}>16 格</option>
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
             {script.length > 0 && script[0].act ? script[0].act.split('：')[0] : '連續漫畫生成'}
          </h1>
          <p className="text-lg text-gray-400 font-medium">
             使用 {MODELS.find(m => m.id === settings.selectedModel)?.name} 視覺化您的故事
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
          <p>Powered by Google Gemini & OpenAI</p>
        </div>
      </main>
    </div>
  );
};

export default App;
