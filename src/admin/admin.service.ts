import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { Role } from '../users/types/role.enum';
import {
  SubscriptionPlan,
  type GrantableSubscriptionPlan,
} from '../users/types/subscription-plan.enum';
import { isPaidSubscriptionPlan } from '../users/types/coach-athlete-limits';
import { OkResponseDto } from '../users/dto/ok-response.dto';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminSubscriptionResponseDto } from './dto/admin-subscription-response.dto';
import { AdminUserListItemDto } from './dto/admin-user-list-item.dto';
import { GetAdminUsersQueryDto } from './dto/get-admin-users-query.dto';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto';
import { RevokeSubscriptionDto } from './dto/revoke-subscription.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_DAYS = 30;

/** YYYY-MM-DD → end of that calendar day in UTC. */
function endOfUtcDay(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

/**
 * Base date to extend from: current expiresAt if still in the future,
 * otherwise now. Free / missing dates always start from now.
 */
function grantDurationBase(
  subscription: UserDocument['subscription'] | undefined,
  now: Date,
): Date {
  if (
    !subscription ||
    !isPaidSubscriptionPlan(subscription.plan) ||
    !subscription.expiresAt
  ) {
    return now;
  }

  const currentExpiry = new Date(subscription.expiresAt).getTime();
  return currentExpiry > now.getTime() ? new Date(subscription.expiresAt) : now;
}

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  getStats(): Promise<AdminStatsResponseDto> {
    return this.usersService.getAdminStats();
  }

  async listUsers(query: GetAdminUsersQueryDto): Promise<{
    data: AdminUserListItemDto[];
    total: number;
  }> {
    const { data, total } = await this.usersService.listAdminUsers(
      query.page,
      query.limit,
      {
        search: query.search,
        role: query.role,
        plan: query.plan,
        expiringSoon: query.expiringSoon,
      },
    );

    return {
      data: data.map((user) => this.toListItem(user)),
      total,
    };
  }

  softDeleteUser(
    requesterUserId: string,
    targetUserId: string,
  ): Promise<OkResponseDto> {
    return this.usersService.adminSoftDeleteUser(requesterUserId, targetUserId);
  }

  async grantSubscription(
    dto: GrantSubscriptionDto,
  ): Promise<AdminSubscriptionResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    assertPlanAllowedForRole(user.role, dto.plan);

    const now = new Date();
    const existing = user.subscription;
    const stillActivePaid =
      existing != null &&
      isPaidSubscriptionPlan(existing.plan) &&
      existing.expiresAt != null &&
      new Date(existing.expiresAt).getTime() > now.getTime();

    const startedAt =
      stillActivePaid && existing.startedAt
        ? new Date(existing.startedAt)
        : now;

    const expiresAt =
      dto.expiresAt != null
        ? endOfUtcDay(dto.expiresAt)
        : new Date(
            grantDurationBase(existing, now).getTime() +
              (dto.durationDays ?? DEFAULT_DURATION_DAYS) * MS_PER_DAY,
          );

    await this.usersService.grantSubscription(
      user.id,
      dto.plan,
      startedAt,
      expiresAt,
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: {
        plan: dto.plan,
        startedAt,
        expiresAt,
      },
    };
  }

  async revokeSubscription(
    dto: RevokeSubscriptionDto,
  ): Promise<AdminSubscriptionResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    await this.usersService.revokeSubscription(user.id);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: {
        plan: SubscriptionPlan.Free,
        startedAt: null,
        expiresAt: null,
      },
    };
  }

  private toListItem(user: UserDocument): AdminUserListItemDto {
    const profile = user.profile;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
        heightCm: profile?.heightCm ?? null,
        sex: profile?.sex ?? null,
        birthDate: profile?.birthDate ?? null,
      },
      goal: user.goal ?? null,
      subscription: {
        plan: user.subscription?.plan ?? SubscriptionPlan.Free,
        startedAt: user.subscription?.startedAt ?? null,
        expiresAt: user.subscription?.expiresAt ?? null,
      },
      coachId: user.coachId ?? null,
      createdAt: (user as UserDocument & { createdAt: Date }).createdAt,
    };
  }
}

/** Athlete → premium; coach → growth|pro; admin → not grantable. */
function assertPlanAllowedForRole(
  role: Role,
  plan: GrantableSubscriptionPlan,
): void {
  if (role === Role.Admin) {
    throw new BadRequestException(
      'Subscriptions cannot be granted to admin accounts',
    );
  }

  if (role === Role.Athlete && plan !== SubscriptionPlan.Premium) {
    throw new BadRequestException(
      'Athletes can only be granted the premium plan',
    );
  }

  if (
    role === Role.Coach &&
    plan !== SubscriptionPlan.Growth &&
    plan !== SubscriptionPlan.Pro
  ) {
    throw new BadRequestException(
      'Coaches can only be granted growth or pro plans',
    );
  }
}
