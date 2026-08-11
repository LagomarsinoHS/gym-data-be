import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  PaginationQueryDto,
  paginationQueryKeys,
} from '../../common/dto/pagination-query.dto';
import { Role } from '../../users/types/role.enum';
import { SubscriptionPlan } from '../../users/types/subscription-plan.enum';

export class GetAdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'ana',
    description: 'Search by profile.firstName, profile.lastName, or email',
  })
  search?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Filter by role' })
  role?: Role;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    description: 'Filter by subscription.plan',
  })
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, only paid users whose subscription.expiresAt is within the next 7 days',
  })
  expiringSoon?: boolean;
}

export const getAdminUsersQuerySchema = Joi.object<GetAdminUsersQueryDto>({
  ...paginationQueryKeys,
  search: Joi.string().trim().empty('').optional(),
  role: Joi.string()
    .valid(...Object.values(Role))
    .optional(),
  plan: Joi.string()
    .valid(...Object.values(SubscriptionPlan))
    .optional(),
  expiringSoon: Joi.boolean().optional(),
});
