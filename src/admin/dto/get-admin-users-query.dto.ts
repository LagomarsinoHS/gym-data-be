import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  PaginationQueryDto,
  paginationQueryKeys,
} from '../../common/dto/pagination-query.dto';
import { Role } from '../../users/types/role.enum';
import { SubscriptionPlan } from '../../users/types/subscription-plan.enum';

export const ADMIN_USERS_SORT_BY = ['lastLoginAt', 'createdAt'] as const;
export type AdminUsersSortBy = (typeof ADMIN_USERS_SORT_BY)[number];

export const ADMIN_USERS_SORT_DIR = ['asc', 'desc'] as const;
export type AdminUsersSortDir = (typeof ADMIN_USERS_SORT_DIR)[number];

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

  @ApiPropertyOptional({
    enum: ADMIN_USERS_SORT_BY,
    example: 'lastLoginAt',
    default: 'lastLoginAt',
    description: 'Sort field',
  })
  sortBy?: AdminUsersSortBy;

  @ApiPropertyOptional({
    enum: ADMIN_USERS_SORT_DIR,
    example: 'desc',
    default: 'desc',
    description: 'Sort direction',
  })
  sortDir?: AdminUsersSortDir;
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
  sortBy: Joi.string()
    .valid(...ADMIN_USERS_SORT_BY)
    .default('lastLoginAt'),
  sortDir: Joi.string()
    .valid(...ADMIN_USERS_SORT_DIR)
    .default('desc'),
});
