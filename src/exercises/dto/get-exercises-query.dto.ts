import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  PaginationQueryDto,
  paginationQueryKeys,
} from '../../common/dto/pagination-query.dto';

export class GetExercisesQueryDto extends PaginationQueryDto {
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
  ...paginationQueryKeys,
  category: Joi.string().trim().empty('').optional(),
  bodyPart: Joi.string().trim().empty('').optional(),
  target: Joi.string().trim().empty('').optional(),
  equipment: Joi.string().trim().empty('').optional(),
  muscleGroup: Joi.string().trim().empty('').optional(),
  search: Joi.string().trim().empty('').optional(),
});
