import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { UserGoal } from '../../users/types/user-goal.enum';
import type {
  NutritionPlan,
  NutritionPlanDocument,
} from '../schemas/nutrition-plan.schema';
import { NutritionPlanStatus } from '../types/nutrition-plan-status.enum';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class NutritionPlanPersonDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  id: string;

  @ApiProperty({ example: 'Humberto' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;
}

export class NutritionPlanFoodDto {
  @ApiProperty({ example: 'Pollo' })
  name: string;

  @ApiProperty({ example: 150 })
  quantity: number;

  @ApiProperty({ example: 'g' })
  unit: string;
}

export class NutritionPlanMealDto {
  @ApiProperty({ example: 'Desayuno' })
  name: string;

  @ApiPropertyOptional({ example: '08:00', nullable: true })
  time: string | null;

  @ApiProperty({ type: [NutritionPlanFoodDto] })
  foods: NutritionPlanFoodDto[];

  @ApiPropertyOptional({ example: null, nullable: true })
  notes: string | null;
}

export class NutritionPlanTargetsDto {
  @ApiProperty({ example: 2200 })
  calories: number;

  @ApiProperty({ example: 160 })
  proteinG: number;

  @ApiProperty({ example: 220 })
  carbsG: number;

  @ApiProperty({ example: 70 })
  fatG: number;
}

export class NutritionPlanDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  id: string;

  @ApiProperty({ type: NutritionPlanPersonDto })
  athlete: NutritionPlanPersonDto;

  @ApiProperty({ type: NutritionPlanPersonDto })
  coach: NutritionPlanPersonDto;

  @ApiProperty({ example: 'Pauta de definición' })
  title: string;

  @ApiProperty({ enum: NutritionPlanStatus, example: NutritionPlanStatus.Active })
  status: NutritionPlanStatus;

  @ApiPropertyOptional({ enum: UserGoal, nullable: true })
  goal: UserGoal | null;

  @ApiProperty({ example: '2026-08-13T00:00:00.000Z' })
  validFrom: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  validUntil: Date | null;

  @ApiProperty({ type: NutritionPlanTargetsDto })
  targets: NutritionPlanTargetsDto;

  @ApiProperty({ type: [NutritionPlanMealDto] })
  meals: NutritionPlanMealDto[];

  @ApiPropertyOptional({ example: null, nullable: true })
  generalNotes: string | null;

  @ApiProperty({ example: '2026-08-13T16:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-13T16:00:00.000Z' })
  updatedAt: Date;
}

export class NutritionPlansResponseDto {
  @ApiProperty({ type: [NutritionPlanDto] })
  data: NutritionPlanDto[];
}

export class CreateNutritionPlanDto {
  @ApiProperty({ example: 'ee923be1-1192-460e-89ee-2275d4d3f206' })
  athleteId: string;

  @ApiProperty({ example: 'Pauta de definición' })
  title: string;

  @ApiPropertyOptional({ enum: UserGoal, nullable: true })
  goal?: UserGoal | null;

  @ApiProperty({ example: '2026-08-13T00:00:00.000Z' })
  validFrom: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  validUntil?: Date | null;

  @ApiProperty({ type: NutritionPlanTargetsDto })
  targets: NutritionPlanTargetsDto;

  @ApiPropertyOptional({ type: [NutritionPlanMealDto] })
  meals?: NutritionPlanMealDto[];

  @ApiPropertyOptional({ example: null, nullable: true })
  generalNotes?: string | null;
}

export class UpdateNutritionPlanDto {
  @ApiPropertyOptional({ example: 'Pauta de definición' })
  title?: string;

  @ApiPropertyOptional({ enum: UserGoal, nullable: true })
  goal?: UserGoal | null;

  @ApiPropertyOptional({ example: '2026-08-13T00:00:00.000Z' })
  validFrom?: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  validUntil?: Date | null;

  @ApiPropertyOptional({ type: NutritionPlanTargetsDto })
  targets?: NutritionPlanTargetsDto;

  @ApiPropertyOptional({ type: [NutritionPlanMealDto] })
  meals?: NutritionPlanMealDto[];

  @ApiPropertyOptional({ example: null, nullable: true })
  generalNotes?: string | null;
}

export class ListNutritionPlansQueryDto {
  @ApiPropertyOptional({
    example: 'ee923be1-1192-460e-89ee-2275d4d3f206',
    description: 'Required for coaches. Ignored for athletes (always self).',
  })
  athleteId?: string;

  @ApiPropertyOptional({ enum: NutritionPlanStatus })
  status?: NutritionPlanStatus;
}

const nullableTime = Joi.string()
  .trim()
  .pattern(TIME_RE)
  .allow('', null)
  .empty('')
  .default(null);

const foodSchema = Joi.object<NutritionPlanFoodDto>({
  name: Joi.string().trim().min(1).max(80).required(),
  quantity: Joi.number().positive().max(100000).required(),
  unit: Joi.string().trim().min(1).max(20).required(),
});

const mealSchema = Joi.object<NutritionPlanMealDto>({
  name: Joi.string().trim().min(1).max(80).required(),
  time: nullableTime,
  foods: Joi.array().items(foodSchema).max(30).default([]),
  notes: Joi.string().trim().max(500).allow('', null).empty('').default(null),
});

const targetsSchema = Joi.object<NutritionPlanTargetsDto>({
  calories: Joi.number().min(0).max(20000).required(),
  proteinG: Joi.number().min(0).max(2000).required(),
  carbsG: Joi.number().min(0).max(2000).required(),
  fatG: Joi.number().min(0).max(2000).required(),
});

const uuid = Joi.string().trim().pattern(UUID_RE).required();

export const createNutritionPlanSchema = Joi.object<CreateNutritionPlanDto>({
  athleteId: uuid,
  title: Joi.string().trim().min(1).max(120).required(),
  goal: Joi.string()
    .valid(...Object.values(UserGoal))
    .allow('', null)
    .empty('')
    .default(null),
  validFrom: Joi.date().iso().required(),
  validUntil: Joi.date().iso().allow(null),
  targets: targetsSchema.required(),
  meals: Joi.array().items(mealSchema).max(12).default([]),
  generalNotes: Joi.string()
    .trim()
    .max(4000)
    .allow('', null)
    .empty('')
    .default(null),
});

export const updateNutritionPlanSchema = Joi.object<UpdateNutritionPlanDto>({
  title: Joi.string().trim().min(1).max(120),
  goal: Joi.string()
    .valid(...Object.values(UserGoal))
    .allow(null),
  validFrom: Joi.date().iso(),
  validUntil: Joi.date().iso().allow(null),
  targets: targetsSchema,
  meals: Joi.array().items(mealSchema).max(12),
  generalNotes: Joi.string().trim().max(4000).allow(null),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required',
  });

export const listNutritionPlansQuerySchema =
  Joi.object<ListNutritionPlansQueryDto>({
    athleteId: Joi.string().trim().pattern(UUID_RE).optional(),
    status: Joi.string()
      .valid(...Object.values(NutritionPlanStatus))
      .optional(),
  }).unknown(false);

export function toNutritionPlanDto(
  plan: NutritionPlan | NutritionPlanDocument,
): NutritionPlanDto {
  const plain =
    typeof (plan as NutritionPlanDocument).toObject === 'function'
      ? (plan as NutritionPlanDocument).toObject()
      : plan;

  return {
    id: plain.id,
    athlete: {
      id: plain.athlete.id,
      firstName: plain.athlete.firstName,
      lastName: plain.athlete.lastName,
    },
    coach: {
      id: plain.coach.id,
      firstName: plain.coach.firstName,
      lastName: plain.coach.lastName,
    },
    title: plain.title,
    status: plain.status,
    goal: plain.goal ?? null,
    validFrom: plain.validFrom,
    validUntil: plain.validUntil ?? null,
    targets: {
      calories: plain.targets.calories,
      proteinG: plain.targets.proteinG,
      carbsG: plain.targets.carbsG,
      fatG: plain.targets.fatG,
    },
    meals: (plain.meals ?? []).map((meal) => ({
      name: meal.name,
      time: meal.time ?? null,
      foods: (meal.foods ?? []).map((food) => ({
        name: food.name,
        quantity: food.quantity,
        unit: food.unit,
      })),
      notes: meal.notes ?? null,
    })),
    generalNotes: plain.generalNotes ?? null,
    createdAt: plain.createdAt as Date,
    updatedAt: plain.updatedAt as Date,
  };
}
