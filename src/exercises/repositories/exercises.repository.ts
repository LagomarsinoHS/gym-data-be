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
  search?: string;
};

export type SampleOneFilters = {
  category: string;
  targets?: string[];
  equipment?: string[];
  excludeIds?: string[];
};

type SampleOneMatch = {
  category: string;
  target?: { $in: string[] };
  equipment?: { $in: string[] };
  id?: { $nin: string[] };
};

/** All exercise fields; instructions / instruction_steps only en + es. */
const EXERCISE_PROJECTION = {
  id: 1,
  name: 1,
  category: 1,
  body_part: 1,
  equipment: 1,
  'instructions.en': 1,
  'instructions.es': 1,
  'instruction_steps.en': 1,
  'instruction_steps.es': 1,
  muscle_group: 1,
  secondary_muscles: 1,
  target: 1,
  image: 1,
  gif_url: 1,
  media_id: 1,
  attribution: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case + accent insensitive pattern for Spanish-friendly search. */
function toAccentInsensitivePattern(input: string): string {
  const base = escapeRegex(input.normalize('NFD').replace(/\p{M}/gu, ''));
  return base
    .replace(/a/gi, '[aáàäâã]')
    .replace(/e/gi, '[eéèëê]')
    .replace(/i/gi, '[iíìïî]')
    .replace(/o/gi, '[oóòöôõ]')
    .replace(/u/gi, '[uúùüû]')
    .replace(/n/gi, '[nñ]')
    .replace(/c/gi, '[cç]');
}

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
      .find(this.buildFilter(filters), EXERCISE_PROJECTION)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  findById(id: string): Promise<ExerciseDocument | null> {
    return this.exerciseModel.findOne({ id }, EXERCISE_PROJECTION).exec();
  }

  count(filters: ExerciseFilters = {}): Promise<number> {
    return this.exerciseModel.countDocuments(this.buildFilter(filters)).exec();
  }

  async findRandom(): Promise<ExerciseDocument | null> {
    const [exercise] = await this.exerciseModel
      .aggregate<ExerciseDocument>([
        { $sample: { size: 1 } },
        { $project: EXERCISE_PROJECTION },
      ])
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

  async findByIds(ids: string[]): Promise<ExerciseDocument[]> {
    return this.exerciseModel
      .find(
        { id: { $in: ids } },
        {
          id: 1,
          name: 1,
          image: 1,
          gif_url: 1,
          category: 1,
          equipment: 1,
        },
      )
      .exec();
  }

  async sampleOne(filters: SampleOneFilters): Promise<ExerciseDocument | null> {
    const match: SampleOneMatch = { category: filters.category };

    if (filters.targets?.length) {
      match.target = { $in: filters.targets };
    }
    if (filters.equipment?.length) {
      match.equipment = { $in: filters.equipment };
    }
    if (filters.excludeIds?.length) {
      match.id = { $nin: filters.excludeIds };
    }

    const [exercise] = await this.exerciseModel
      .aggregate<ExerciseDocument>([
        { $match: match },
        { $sample: { size: 1 } },
        { $project: EXERCISE_PROJECTION },
      ])
      .exec();

    return exercise ?? null;
  }

  private buildFilter(filters: ExerciseFilters) {
    const exerciseFilter: {
      category?: string;
      body_part?: string;
      equipment?: string;
      muscle_group?: string;
      target?: string;
      $or?: Array<
        { 'name.en': RegExp } | { 'name.es': RegExp } | { id: RegExp }
      >;
    } = {};

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
    if (filters.search) {
      const rx = new RegExp(toAccentInsensitivePattern(filters.search), 'i');
      exerciseFilter.$or = [{ 'name.en': rx }, { 'name.es': rx }, { id: rx }];
    }

    return exerciseFilter;
  }
}
