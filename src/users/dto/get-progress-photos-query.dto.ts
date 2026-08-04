import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export class GetProgressPhotosQueryDto {
  @ApiPropertyOptional({
    example: 2026,
    description: 'If set, only months for this calendar year are returned',
  })
  year?: number;
}

export const getProgressPhotosQuerySchema =
  Joi.object<GetProgressPhotosQueryDto>({
    year: Joi.number().integer().min(2000).max(2100).optional(),
  })
    .unknown(false)
    .messages({
      'object.unknown':
        '"{{#key}}" is not allowed. Only "year" query param is accepted',
    });
