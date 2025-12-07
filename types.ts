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