
export enum Language {
  ENGLISH = 'English',
  UZBEK = 'Uzbek',
  KAZAKH = 'Kazakh',
  TAJIK = 'Tajik',
  KYRGYZ = 'Kyrgyz',
  RUSSIAN = 'Russian',
  TURKMEN = 'Turkmen'
}

export interface MnemonicResponse {
  word: string;
  transcription: string;
  meaning: string;
  morphology: string;
  imagination: string;
  phoneticLink: string;
  connectorSentence: string;
  examples: string[];
  synonyms: string[];
  imagePrompt: string;
  level: string;
  category?: string;
  audioUrl?: string;
  isHard?: boolean;
}

export interface SavedMnemonic {
  id: string;
  word: string;
  data: MnemonicResponse;
  imageUrl: string;
  timestamp: number;
  language: Language;
  isHard?: boolean;
  isMastered?: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULTS = 'RESULTS',
  VOICE_MODE = 'VOICE_MODE',
  ERROR = 'ERROR'
}

export enum AppView {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  DASHBOARD = 'DASHBOARD',
  FLASHCARDS = 'FLASHCARDS',
  PROFILE = 'PROFILE',
  POSTS = 'POSTS',
  MY_POSTS = 'MY_POSTS',
  MY_REMIXES = 'MY_REMIXES',
  CREATE_POST = 'CREATE_POST',
  PRACTICE = 'PRACTICE',
  CATEGORIES = 'CATEGORIES',
  CATEGORY_DETAIL = 'CATEGORY_DETAIL',
  AUTH = 'AUTH',
  PERSONALIZATION = 'PERSONALIZATION',
  WORD_REVIEW = 'WORD_REVIEW'
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  trial_ends_at: string;
  is_pro: boolean;
  subscription_id: string | null;
  created_at: string;
  preferred_language?: Language;
  ui_language?: Language;
  daily_goal?: number;
  ielts_goal?: number;
  is_personalized?: boolean;
}

export interface Post {
  id: string;
  post_metadata: {
    username: string;
    avatar_url?: string | null;
    timestamp: number;
    user_id: string;
  };
  mnemonic_data: {
    english_word: string;
    native_keyword: string;
    story: string;
  };
  visuals: {
    user_uploaded_image: string | null;
    audio_url?: string | null;
    ui_style: 'light' | 'dark';
  };
  language: Language;
  engagement: {
    likes: number;
    dislikes: number;
    impression_emojis: { emoji: string; count: number }[];
    user_liked?: boolean;
    user_disliked?: boolean;
    user_emoji?: string;
  };
  remix_data?: {
    parent_post_id: string;
    parent_username: string;
  };
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
