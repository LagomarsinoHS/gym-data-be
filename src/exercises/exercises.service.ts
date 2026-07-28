import { Injectable, NotFoundException } from '@nestjs/common';
import { ExerciseLabelsResponseDto } from './dto/exercise-labels-response.dto';
import { GetExercisesQueryDto } from './dto/get-exercises-query.dto';
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
}
