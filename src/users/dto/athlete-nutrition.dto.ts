import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { NutritionDailyActivity } from '../types/nutrition-daily-activity.enum';
import { NutritionDietType } from '../types/nutrition-diet-type.enum';
import { NutritionTrainFasted } from '../types/nutrition-train-fasted.enum';
import type {
  AthleteNutrition,
  NutritionMeal,
  NutritionUpdatedBy,
} from '../schemas/user.schema';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class NutritionMealDto {
  @ApiProperty({ example: 'Desayuno' })
  name: string;

  @ApiPropertyOptional({
    example: '08:00',
    nullable: true,
    description: 'HH:mm or null if unset',
  })
  time: string | null;
}

export class NutritionUpdatedByDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  id: string;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'García' })
  lastName: string;
}

export class AthleteNutritionDto {
  @ApiPropertyOptional({
    enum: NutritionDailyActivity,
    nullable: true,
    example: NutritionDailyActivity.Sedentary,
  })
  dailyActivity: NutritionDailyActivity | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  trainingsPerWeek: number | null;

  @ApiPropertyOptional({ example: 75, nullable: true })
  avgDurationMin: number | null;

  @ApiPropertyOptional({ example: 6500, nullable: true })
  dailySteps: number | null;

  @ApiPropertyOptional({ example: 60, nullable: true })
  weeklyCardioMin: number | null;

  @ApiPropertyOptional({ example: 'Caminatas', nullable: true })
  extraActivity: string | null;

  @ApiPropertyOptional({
    example: '18:00',
    nullable: true,
    description: 'HH:mm or null if unset',
  })
  trainingTime: string | null;

  @ApiPropertyOptional({
    enum: NutritionTrainFasted,
    nullable: true,
    example: NutritionTrainFasted.AfterMeal,
  })
  trainFasted: NutritionTrainFasted | null;

  @ApiProperty({ type: [NutritionMealDto] })
  meals: NutritionMealDto[];

  @ApiProperty({ type: [String], example: ['Pollo', 'Arroz'] })
  likes: string[];

  @ApiProperty({ type: [String], example: ['Pescado'] })
  avoids: string[];

  @ApiPropertyOptional({
    enum: NutritionDietType,
    nullable: true,
    example: NutritionDietType.None,
  })
  dietType: NutritionDietType | null;

  @ApiProperty({ type: [String], example: [] })
  restrictions: string[];

  @ApiPropertyOptional({ example: null, nullable: true })
  notes: string | null;

  @ApiPropertyOptional({
    example: '2026-08-13T16:00:00.000Z',
    nullable: true,
  })
  updatedAt: Date | null;

  @ApiPropertyOptional({
    type: NutritionUpdatedByDto,
    nullable: true,
    description: 'Coach snapshot that last saved this profile',
  })
  updatedBy: NutritionUpdatedByDto | null;
}

export class SetAthleteNutritionDto {
  @ApiPropertyOptional({ enum: NutritionDailyActivity, nullable: true })
  dailyActivity?: NutritionDailyActivity | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  trainingsPerWeek?: number | null;

  @ApiPropertyOptional({ example: 75, nullable: true })
  avgDurationMin?: number | null;

  @ApiPropertyOptional({ example: 60, nullable: true })
  weeklyCardioMin?: number | null;

  @ApiPropertyOptional({ example: 6500, nullable: true })
  dailySteps?: number | null;

  @ApiPropertyOptional({ example: 'Caminatas', nullable: true })
  extraActivity?: string | null;

  @ApiPropertyOptional({ example: '18:00', nullable: true })
  trainingTime?: string | null;

  @ApiPropertyOptional({ enum: NutritionTrainFasted, nullable: true })
  trainFasted?: NutritionTrainFasted | null;

  @ApiPropertyOptional({ type: [NutritionMealDto] })
  meals?: NutritionMealDto[];

  @ApiPropertyOptional({ type: [String] })
  likes?: string[];

  @ApiPropertyOptional({ type: [String] })
  avoids?: string[];

  @ApiPropertyOptional({ enum: NutritionDietType, nullable: true })
  dietType?: NutritionDietType | null;

  @ApiPropertyOptional({ type: [String] })
  restrictions?: string[];

  @ApiPropertyOptional({ example: null, nullable: true })
  notes?: string | null;
}

const nullableTime = Joi.string()
  .trim()
  .pattern(TIME_RE)
  .allow('', null)
  .empty('')
  .default(null);

const mealSchema = Joi.object<NutritionMealDto>({
  name: Joi.string().trim().min(1).max(80).required(),
  time: nullableTime,
});

export const setAthleteNutritionSchema = Joi.object<SetAthleteNutritionDto>({
  dailyActivity: Joi.string()
    .valid(...Object.values(NutritionDailyActivity))
    .allow('', null)
    .empty('')
    .default(null),
  trainingsPerWeek: Joi.number().integer().min(0).max(14).allow(null),
  avgDurationMin: Joi.number().integer().min(0).max(300).allow(null),
  dailySteps: Joi.number().integer().min(0).max(100000).allow(null),
  weeklyCardioMin: Joi.number().integer().min(0).max(1000).allow(null),
  extraActivity: Joi.string().trim().max(200).allow('', null).empty('').default(null),
  trainingTime: nullableTime,
  trainFasted: Joi.string()
    .valid(...Object.values(NutritionTrainFasted))
    .allow('', null)
    .empty('')
    .default(null),
  meals: Joi.array().items(mealSchema).max(8),
  likes: Joi.array().items(Joi.string().trim().max(40)).max(30),
  avoids: Joi.array().items(Joi.string().trim().max(40)).max(30),
  dietType: Joi.string()
    .valid(...Object.values(NutritionDietType))
    .allow('', null)
    .empty('')
    .default(null),
  restrictions: Joi.array().items(Joi.string().trim().max(40)).max(30),
  notes: Joi.string().trim().max(2000).allow('', null).empty('').default(null),
});

export function emptyAthleteNutrition(): AthleteNutritionDto {
  return {
    dailyActivity: null,
    trainingsPerWeek: null,
    avgDurationMin: null,
    dailySteps: null,
    weeklyCardioMin: null,
    extraActivity: null,
    trainingTime: null,
    trainFasted: null,
    meals: [],
    likes: [],
    avoids: [],
    dietType: null,
    restrictions: [],
    notes: null,
    updatedAt: null,
    updatedBy: null,
  };
}

export function toNutritionUpdatedByDto(
  value: NutritionUpdatedBy | string | null | undefined,
): NutritionUpdatedByDto | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const id = value.trim();
    return id ? { id, firstName: '', lastName: '' } : null;
  }
  const id = String(value.id || '').trim();
  if (!id) return null;
  return {
    id,
    firstName: String(value.firstName || '').trim(),
    lastName: String(value.lastName || '').trim(),
  };
}

export function toAthleteNutritionDto(
  nutrition: AthleteNutrition | null | undefined,
): AthleteNutritionDto {
  if (!nutrition) return emptyAthleteNutrition();

  return {
    dailyActivity: nutrition.dailyActivity ?? null,
    trainingsPerWeek: nutrition.trainingsPerWeek ?? null,
    avgDurationMin: nutrition.avgDurationMin ?? null,
    dailySteps: nutrition.dailySteps ?? null,
    weeklyCardioMin: nutrition.weeklyCardioMin ?? null,
    extraActivity: nutrition.extraActivity ?? null,
    trainingTime: nutrition.trainingTime ?? null,
    trainFasted: nutrition.trainFasted ?? null,
    meals: (nutrition.meals ?? []).map((meal: NutritionMeal) => ({
      name: meal.name,
      time: meal.time ?? null,
    })),
    likes: [...(nutrition.likes ?? [])],
    avoids: [...(nutrition.avoids ?? [])],
    dietType: nutrition.dietType ?? null,
    restrictions: [...(nutrition.restrictions ?? [])],
    notes: nutrition.notes ?? null,
    updatedAt: nutrition.updatedAt ?? null,
    updatedBy: toNutritionUpdatedByDto(nutrition.updatedBy),
  };
}
