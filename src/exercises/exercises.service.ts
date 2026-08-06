import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpenAiService } from '../openai/openai.service';
import { getZonePreset } from './constants/zone-presets';
import { ExerciseLabelsResponseDto } from './dto/exercise-labels-response.dto';
import { GetExercisesQueryDto } from './dto/get-exercises-query.dto';
import {
  Recommend2ExerciseDto,
  Recommend2QueryDto,
  Recommend2ResponseDto,
} from './dto/recommend2-exercises.dto';
import {
  RecommendExercisesQueryDto,
  RecommendExercisesResponseDto,
  RecommendedExerciseDto,
} from './dto/recommend-exercises.dto';
import { ExercisesRepository } from './repositories/exercises.repository';
import { ExerciseDocument } from './schemas/exercise.schema';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly exercisesRepository: ExercisesRepository,
    private readonly openAiService: OpenAiService,
  ) {}

  async getExercises({
    page,
    limit,
    ...filters
  }: GetExercisesQueryDto): Promise<{
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

  async recommend(
    query: RecommendExercisesQueryDto,
  ): Promise<RecommendExercisesResponseDto> {
    const preset = getZonePreset(query.zone);
    if (!preset) {
      throw new BadRequestException(`Unknown zone: ${query.zone}`);
    }

    const slots = preset.slots;
    const excludeIds: string[] = [];
    const exercises: RecommendedExerciseDto[] = [];

    for (const slot of slots) {
      const picked = await this.pickForSlot({
        category: preset.category,
        slotTargets: slot.targets,
        zoneTargets: preset.targets,
        equipment: query.equipment,
        excludeIds,
      });

      if (!picked) {
        continue;
      }

      excludeIds.push(picked.id);
      exercises.push({
        role: slot.role,
        exercise: {
          id: picked.id,
          name: picked.name,
          image: picked.image,
          gif_url: picked.gif_url,
          category: picked.category,
          equipment: picked.equipment,
        },
      });
    }

    return {
      zone: preset.zone,
      equipment: query.equipment,
      exercises,
    };
  }

  /**
   * AI recommend: zone + 1–2 equipment → slim candidates → OpenAI picks 4 + note.
   */
  async recommend2(query: Recommend2QueryDto): Promise<Recommend2ResponseDto> {
    const exerciseList = await this.exercisesRepository.findForRecommend(
      query.zone,
      query.equipment,
    );

    if (exerciseList.length < 4) {
      throw new BadRequestException(
        `Not enough exercises for zone="${query.zone}" and equipment=[${query.equipment.join(', ')}] (need at least 4, found ${exerciseList.length})`,
      );
    }

    const locale = query.locale;
    const byId = new Map(
      exerciseList.map((exercise) => [exercise.id, exercise]),
    );
    const openAiCandidates = exerciseList.map((row) => ({
      id: row.id,
      name: locale === 'en' ? row.name?.en : row.name?.es,
      equipment: row.equipment,
      target: row.target,
    }));

    openAiCandidates.length = 2;

    const { ids, note } = await this.openAiService.recommendWorkout({
      zone: query.zone,
      equipment: query.equipment,
      locale,
      candidates: openAiCandidates,
    });

    const exercises: Recommend2ExerciseDto[] = ids.flatMap((id) => {
      const exercise = byId.get(id);
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
        },
      ];
    });

    if (exercises.length !== 4) {
      throw new BadRequestException(
        'Could not resolve the 4 recommended exercises from the catalog',
      );
    }

    return {
      zone: query.zone,
      equipment: query.equipment,
      locale,
      note,
      exercises,
    };
  }

  private async pickForSlot(params: {
    category: string;
    slotTargets: string[];
    zoneTargets: string[];
    equipment: string[];
    excludeIds: string[];
  }): Promise<ExerciseDocument | null> {
    const { category, slotTargets, zoneTargets, equipment, excludeIds } =
      params;

    const attempts: Array<{
      targets?: string[];
      equipment?: string[];
    }> = [
      { targets: slotTargets, equipment },
      { targets: slotTargets },
      { targets: zoneTargets, equipment },
      { targets: zoneTargets },
      { equipment },
      {},
    ];

    for (const attempt of attempts) {
      const found: ExerciseDocument | null =
        await this.exercisesRepository.sampleOne({
          category,
          targets: attempt.targets,
          equipment: attempt.equipment,
          excludeIds,
        });
      if (found) {
        return found;
      }
    }

    return null;
  }
}
