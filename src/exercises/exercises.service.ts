import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AiService } from '../ai/ai.service';
import { AI_SERVICE } from '../ai/ai.tokens';
import { ExerciseLabelsResponseDto } from './dto/exercise-labels-response.dto';
import { GetExercisesQueryDto } from './dto/get-exercises-query.dto';
import {
  RecommendExerciseDto,
  RecommendExercisesQueryDto,
  RecommendExercisesResponseDto,
} from './dto/recommend-exercises.dto';
import { ExercisesRepository } from './repositories/exercises.repository';
import { ExerciseDocument } from './schemas/exercise.schema';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly exercisesRepository: ExercisesRepository,
    @Inject(AI_SERVICE) private readonly aiService: AiService,
  ) {}

  async getExercises({ page, limit, ...filters }: GetExercisesQueryDto): Promise<{
    data: ExerciseDocument[];
    total: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.exercisesRepository.find(skip, limit, filters),
      this.exercisesRepository.count(filters),
    ]);

    return { data, total };
  }

  getExerciseLabels(): Promise<ExerciseLabelsResponseDto> {
    return this.exercisesRepository.findLabels();
  }

  async getRandomExercise(): Promise<ExerciseDocument> {
    const exercise = await this.exercisesRepository.findRandom();
    if (!exercise) {
      throw new NotFoundException('No exercises found');
    }
    return exercise;
  }

  async getExerciseById(id: string): Promise<ExerciseDocument> {
    const exercise = await this.exercisesRepository.findById(id);
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${id} not found`);
    }
    return exercise;
  }

  async getExercisesByIds(ids: string[]): Promise<ExerciseDocument[]> {
    return await this.exercisesRepository.findByIds(ids);
  }

  /**
   * AI recommend: zone + 1–2 equipment → slim candidates → AI picks 4 + note.
   */
  async recommend(query: RecommendExercisesQueryDto): Promise<RecommendExercisesResponseDto> {
    const exerciseList = await this.exercisesRepository.findForRecommend(query.zone, query.equipment);

    if (exerciseList.length < 4) {
      throw new BadRequestException(
        `Not enough exercises for zone="${query.zone}" and equipment=[${query.equipment.join(', ')}] (need at least 4, found ${exerciseList.length})`,
      );
    }

    const locale = query.locale;
    const byId = new Map(exerciseList.map((exercise) => [exercise.id, exercise]));
    const candidates = exerciseList.map((row) => ({
      id: row.id,
      name: locale === 'en' ? row.name?.en : row.name?.es,
      equipment: row.equipment,
      target: row.target,
    }));

    const { detailedExercises, note } = await this.aiService.recommendWorkout({
      zone: query.zone,
      equipment: query.equipment,
      locale,
      candidates,
    });

    const exercises: RecommendExerciseDto[] = detailedExercises.flatMap((ex) => {
      const exercise = byId.get(ex.id);
      if (!exercise) {
        return [];
      }
      return [
        {
          id: exercise.id,
          name: exercise.name,
          image: exercise.image,
          gif_url: exercise.gif_url,
          category: exercise.category,
          equipment: exercise.equipment,
          target: exercise.target,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
        },
      ];
    });

    if (exercises.length !== 4) {
      throw new BadRequestException('Could not resolve the 4 recommended exercises from the catalog');
    }

    return {
      zone: query.zone,
      equipment: query.equipment,
      locale,
      note,
      exercises,
    };
  }
}
