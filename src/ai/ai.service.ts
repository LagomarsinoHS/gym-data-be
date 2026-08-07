import type { AnalyzeProgressInput, AnalyzeProgressResult } from './types/analyze-progress.type';
import type { RecommendWorkoutInput, RecommendWorkoutResult } from './types/recommend-workout.type';

/** Domain AI port — providers (Gemini, OpenAI, …) implement this. */
export interface AiService {
  recommendWorkout(input: RecommendWorkoutInput): Promise<RecommendWorkoutResult>;
  analyzeProgressPhotos(input: AnalyzeProgressInput): Promise<AnalyzeProgressResult>;
}
