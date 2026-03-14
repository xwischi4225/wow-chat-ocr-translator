export interface FeedEntry {
  id: string;
  timestamp: Date;
  original: string;
  translated: string;
  detectedLanguage?: string;
  isLoading?: boolean;
}

export interface Region {
  x: number; // fraction 0-1 of video display width
  y: number;
  w: number;
  h: number;
}

export interface RegionPreset {
  name: string;
  region: Region;
}

export type OcrStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "processing"
  | "error";

export type TargetLang = "en" | "de" | "fr" | "ja";

export const LANG_LABELS: Record<TargetLang, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
};
