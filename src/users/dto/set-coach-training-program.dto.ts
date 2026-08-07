import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export class CoachTrainingProgramItemDto {
  @ApiProperty({ example: '0001' })
  exerciseId: string;

  @ApiPropertyOptional({ example: 1 })
  order?: number;

  @ApiPropertyOptional({ example: 3 })
  sets?: number;

  @ApiPropertyOptional({ example: '8 - 12' })
  reps?: string;

  @ApiPropertyOptional({ example: 90 })
  rest?: number;

  @ApiPropertyOptional({ example: 'Controlar la bajada' })
  notes?: string;
}

export class CoachTrainingProgramDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  id: string;

  @ApiProperty({ example: 'Lunes' })
  name: string;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ type: [CoachTrainingProgramItemDto] })
  items: CoachTrainingProgramItemDto[];
}

export class SetCoachTrainingProgramDto {
  @ApiProperty({
    type: [CoachTrainingProgramDto],
    description:
      'Full coachTrainingProgram to store for the athlete (replace). Send exerciseId only; catalog exercise objects are stripped.',
  })
  coachTrainingProgram: CoachTrainingProgramDto[];
}

const itemSchema = Joi.object<CoachTrainingProgramItemDto>({
  exerciseId: Joi.string().trim().min(1).required(),
  order: Joi.number().integer().min(0).optional(),
  sets: Joi.number().integer().min(1).optional(),
  reps: Joi.string().trim().min(1).optional(),
  rest: Joi.number().integer().min(0).optional(),
  notes: Joi.string().trim().allow('').optional(),
});

const coachTrainingProgramSchema = Joi.object<CoachTrainingProgramDto>({
  id: Joi.string().trim().min(1).required(),
  name: Joi.string().trim().min(1).required(),
  order: Joi.number().integer().min(0).required(),
  items: Joi.array().items(itemSchema).required(),
});

export const setCoachTrainingProgramSchema = Joi.object<SetCoachTrainingProgramDto>({
  coachTrainingProgram: Joi.array().items(coachTrainingProgramSchema).required(),
});
