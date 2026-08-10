import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  page: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  limit: number;
}

/** Shared optional query params for list endpoints that return PaginatedResponse. */
export const paginationQueryKeys = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
};

export const paginationQuerySchema =
  Joi.object<PaginationQueryDto>(paginationQueryKeys);
