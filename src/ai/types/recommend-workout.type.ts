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

export type RecommendWorkoutDetailedExercise = {
  id: string;
  sets: number;
  reps: string;
  rest: number;
};

export type RecommendWorkoutResult = {
  detailedExercises: RecommendWorkoutDetailedExercise[];
  note: string;
};
