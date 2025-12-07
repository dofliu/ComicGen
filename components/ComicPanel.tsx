import React from 'react';
import { ComicPanelData, GenerationStatus, PanelState } from '../types';

interface ComicPanelProps {
  data: ComicPanelData;
  state: PanelState;
  onRegenerate: (id: number) => void;
}

const ComicPanel: React.FC<ComicPanelProps> = ({ data, state, onRegenerate }) => {
  return (
    <div className="flex flex-col bg-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden shadow-xl mb-8 break-inside-avoid">
      {/* Header */}
      <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
        <div>
          <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider block">{data.act}</span>
          <h3 className="text-white font-bold text-lg comic-font tracking-wide">#{data.id} {data.title}</h3>
        </div>
        {data.techNote && (
          <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs font-mono rounded border border-blue-700/50">
            {data.techNote}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="relative aspect-video bg-black w-full flex items-center justify-center overflow-hidden group">
        {state.status === GenerationStatus.IDLE && (
          <div className="text-gray-500 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">等待生成...</span>
          </div>
        )}

        {state.status === GenerationStatus.LOADING && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-blue-400 text-xs animate-pulse font-mono">正在繪製圖像...</p>
          </div>
        )}

        {state.status === GenerationStatus.SUCCESS && state.imageUrl && (
          <>
            <img 
              src={state.imageUrl} 
              alt={data.visualDescription}
              className="w-full h-full object-cover"
            />
            {/* Hover Action */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onRegenerate(data.id)}
                className="bg-black/70 hover:bg-black text-white p-2 rounded-full backdrop-blur-sm"
                title="重新生成此格"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </>
        )}

        {state.status === GenerationStatus.ERROR && (
           <div className="text-red-400 flex flex-col items-center p-4 text-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <span className="text-sm font-bold">生成失敗</span>
             <span className="text-xs mt-1 opacity-75">{state.error}</span>
             <button 
               onClick={() => onRegenerate(data.id)}
               className="mt-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs uppercase"
             >
               重試
             </button>
           </div>
        )}
      </div>

      {/* Dialogue Section */}
      <div className="bg-white p-4 space-y-3">
        {data.dialogue.map((line, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className={`
              flex-shrink-0 w-20 text-xs font-bold text-right uppercase py-1
              ${line.character.includes('綱手') || line.character === 'Tsunade' ? 'text-green-700' : ''}
              ${line.character.includes('鳴人') || line.character === 'Naruto' ? 'text-orange-600' : ''}
              ${line.character.includes('小櫻') || line.character === 'Sakura' ? 'text-pink-600' : ''}
              ${line.character.includes('雛田') || line.character === 'Hinata' ? 'text-purple-600' : ''}
            `}>
              {line.character}
            </div>
            <div className={`
              relative p-3 rounded-lg text-sm text-gray-800 font-medium leading-relaxed flex-grow
              ${(line.character.includes('鳴人') || line.character === 'Naruto') ? 'bg-orange-50 border border-orange-200' : 'bg-gray-100 border border-gray-200'}
            `}>
              {/* Comic bubble tail simulated */}
              <div className={`absolute top-3 -left-1 w-2 h-2 transform rotate-45 ${(line.character.includes('鳴人') || line.character === 'Naruto') ? 'bg-orange-50 border-l border-b border-orange-200' : 'bg-gray-100 border-l border-b border-gray-200'}`}></div>
              {line.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComicPanel;