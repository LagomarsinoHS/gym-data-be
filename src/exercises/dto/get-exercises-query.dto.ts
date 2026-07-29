import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export class GetExercisesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  page: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  limit: number;

  @ApiPropertyOptional({ example: 'waist' })
  category?: string;

  @ApiPropertyOptional({ example: 'waist' })
  bodyPart?: string;

  @ApiPropertyOptional({ example: 'abs' })
  target?: string;

  @ApiPropertyOptional({ example: 'body weight' })
  equipment?: string;

  @ApiPropertyOptional({ example: 'hip flexors' })
  muscleGroup?: string;

  @ApiPropertyOptional({ example: 'sit-up' })
  search?: string;
}

export const getExercisesQuerySchema = Joi.object<GetExercisesQueryDto>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  category: Joi.string().trim().empty('').optional(),
  bodyPart: Joi.string().trim().empty('').optional(),
  target: Joi.string().trim().empty('').optional(),
  equipment: Joi.string().trim().empty('').optional(),
  muscleGroup: Joi.string().trim().empty('').optional(),
  search: Joi.string().trim().empty('').optional(),
});
