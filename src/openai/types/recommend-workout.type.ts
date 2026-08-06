export type RecommendWorkoutCandidate = {
  id: string;
  name: string;
  equipment?: string;
  target?: string;
};

export type RecommendLocale = 'es' | 'en';

export type RecommendWorkoutInput = {
  zone: string;
  equipment: string[];
  locale: RecommendLocale;
  candidates: RecommendWorkoutCandidate[];
};

export type RecommendWorkoutResult = {
  ids: string[];
  note: string;
};

export type OpenAiRecommendJson = {
  ids?: unknown;
  note?: unknown;
};
