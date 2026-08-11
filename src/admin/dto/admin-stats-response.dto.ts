import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsByRoleDto {
  @ApiProperty({ example: 42 })
  athlete: number;

  @ApiProperty({ example: 8 })
  coach: number;

  @ApiProperty({ example: 1 })
  admin: number;
}

export class AdminStatsUsersDto {
  @ApiProperty({ example: 51 })
  total: number;

  @ApiProperty({ type: AdminStatsByRoleDto })
  byRole: AdminStatsByRoleDto;
}

export class AdminStatsByPlanDto {
  @ApiProperty({ example: 40 })
  free: number;

  @ApiProperty({ example: 6 })
  premium: number;

  @ApiProperty({ example: 3 })
  growth: number;

  @ApiProperty({ example: 2 })
  pro: number;
}

export class AdminStatsSubscriptionsDto {
  @ApiProperty({ type: AdminStatsByPlanDto })
  byPlan: AdminStatsByPlanDto;

  @ApiProperty({
    example: 2,
    description:
      'Active paid users whose subscription.expiresAt is within the next 7 days (UTC now).',
  })
  paidExpiringSoon: number;
}

export class AdminStatsSignupsDto {
  @ApiProperty({ example: 5 })
  last7Days: number;

  @ApiProperty({ example: 18 })
  last30Days: number;
}

/** Aggregates for admin Overview. Soft-deleted users are excluded. */
export class AdminStatsResponseDto {
  @ApiProperty({ type: AdminStatsUsersDto })
  users: AdminStatsUsersDto;

  @ApiProperty({ type: AdminStatsSubscriptionsDto })
  subscriptions: AdminStatsSubscriptionsDto;

  @ApiProperty({ type: AdminStatsSignupsDto })
  signups: AdminStatsSignupsDto;
}
