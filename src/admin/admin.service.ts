import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MeResponseDto } from '../users/dto/me-response.dto';
import { GrantPremiumDto } from './dto/grant-premium.dto';
import { RevokePremiumDto } from './dto/revoke-premium.dto';

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

  async grantPremium(dto: GrantPremiumDto): Promise<MeResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    const expiresAt =
      dto.expiresAt != null
        ? endOfUtcDay(dto.expiresAt)
        : new Date(
            Date.now() +
              (dto.durationDays ?? DEFAULT_DURATION_DAYS) * MS_PER_DAY,
          );

    return this.usersService.grantSubscription(user.id, dto.plan, expiresAt);
  }

  async revokePremium(dto: RevokePremiumDto): Promise<MeResponseDto> {
    const user = await this.usersService.findByIdOrEmail({
      email: dto.email,
    });

    return this.usersService.revokePremium(user.id);
  }
}
