import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getZonePreset } from './constants/zone-presets';
import { ExerciseLabelsResponseDto } from './dto/exercise-labels-response.dto';
import { GetExercisesQueryDto } from './dto/get-exercises-query.dto';
import {
  RecommendExercisesQueryDto,
  RecommendExercisesResponseDto,
  RecommendedExerciseDto,
} from './dto/recommend-exercises.dto';
import { ExercisesRepository } from './repositories/exercises.repository';
import { ExerciseDocument } from './schemas/exercise.schema';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

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
    console.log({ slots });

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
