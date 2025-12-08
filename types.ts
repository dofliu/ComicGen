
export interface ComicPanelData {
  id: number;
  act: string;
  title: string;
  visualDescription: string;
  dialogue: {
    character: string;
    text: string;
  }[];
  techNote?: string; // Concept being explained (e.g., RAG, Embedding)
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface PanelState {
  status: GenerationStatus;
  imageUrl?: string;
  error?: string;
}

export interface GenerationConfig {
  aspectRatio: "16:9" | "1:1" | "4:3";
  stylePreset: string;
}

export type ModelId = 
  | 'gemini-3-pro-image-preview'
  | 'gemini-2.5-flash-image'
  | 'imagen-3.0-generate-001'
  | 'gpt-image-1';

export interface AppSettings {
  googleApiKey: string;
  openaiApiKey: string;
  selectedModel: ModelId;
}
