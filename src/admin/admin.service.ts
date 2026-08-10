import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SubscriptionPlan } from '../users/types/subscription-plan.enum';
import { AdminSubscriptionResponseDto } from './dto/admin-subscription-response.dto';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto';
import { RevokeSubscriptionDto } from './dto/revoke-subscription.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_DAYS = 30;

/** YYYY-MM-DD → end of that calendar day in UTC. */
function endOfUtcDay(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  async grantSubscription(
    dto: GrantSubscriptionDto,
  ): Promise<AdminSubscriptionResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    const startedAt = new Date();
    const expiresAt =
      dto.expiresAt != null
        ? endOfUtcDay(dto.expiresAt)
        : new Date(
            startedAt.getTime() +
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
}
