import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export class UpdateTrainingProgramExerciseDto {
  @ApiPropertyOptional({ example: 3 })
  sets?: number;

  @ApiPropertyOptional({ example: '8-12' })
  reps?: string;

  @ApiPropertyOptional({ example: 90 })
  rest?: number;

  @ApiPropertyOptional({ example: 'Controlar la bajada' })
  notes?: string;
}

export const updateTrainingProgramExerciseSchema = Joi.object<UpdateTrainingProgramExerciseDto>({
  sets: Joi.number().integer().min(1).optional(),
  reps: Joi.string().trim().min(1).optional(),
  rest: Joi.number().integer().min(0).optional(),
  notes: Joi.string().trim().allow('').optional(),
}).or('sets', 'reps', 'rest', 'notes');
