import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExerciseLabelsResponseDto } from '../dto/exercise-labels-response.dto';
import { Exercise, ExerciseDocument } from '../schemas/exercise.schema';

export type ExerciseFilters = {
  category?: string;
  bodyPart?: string;
  equipment?: string;
  muscleGroup?: string;
  target?: string;
};

@Injectable()
export class ExercisesRepository {
  constructor(
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
  ) {}

  find(
    skip: number,
    limit: number,
    filters: ExerciseFilters = {},
  ): Promise<ExerciseDocument[]> {
    return this.exerciseModel
      .find(this.buildFilter(filters))
      .skip(skip)
      .limit(limit)
      .exec();
  }

  findById(id: string): Promise<ExerciseDocument | null> {
    return this.exerciseModel.findOne({ id }).exec();
  }

  count(filters: ExerciseFilters = {}): Promise<number> {
    return this.exerciseModel.countDocuments(this.buildFilter(filters)).exec();
  }

  async findRandom(): Promise<ExerciseDocument | null> {
    const [exercise] = await this.exerciseModel
      .aggregate<ExerciseDocument>([{ $sample: { size: 1 } }])
      .exec();

    return exercise ?? null;
  }

  async findLabels(): Promise<ExerciseLabelsResponseDto> {
    const [category, equipment, target] = await Promise.all([
      this.exerciseModel.distinct('category').exec(),
      this.exerciseModel.distinct('equipment').exec(),
      this.exerciseModel.distinct('target').exec(),
    ]);

    return {
      category: category.sort(),
      equipment: equipment.sort(),
      target: target.sort(),
    };
  }

  private buildFilter(filters: ExerciseFilters): Record<string, string> {
    const exerciseFilter: Record<string, string> = {};

    if (filters.category) {
      exerciseFilter.category = filters.category;
    }
    if (filters.bodyPart) {
      exerciseFilter.body_part = filters.bodyPart;
    }
    if (filters.equipment) {
      exerciseFilter.equipment = filters.equipment;
    }
    if (filters.muscleGroup) {
      exerciseFilter.muscle_group = filters.muscleGroup;
    }
    if (filters.target) {
      exerciseFilter.target = filters.target;
    }

    return exerciseFilter;
  }
}
