import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  PaginationQueryDto,
  paginationQueryKeys,
} from '../../common/dto/pagination-query.dto';

export class GetCoachAthletesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'ana',
    description: 'Search by firstName, lastName, or email',
  })
  search?: string;
}

export const getCoachAthletesQuerySchema = Joi.object<GetCoachAthletesQueryDto>(
  {
    ...paginationQueryKeys,
    search: Joi.string().trim().empty('').optional(),
  },
);
