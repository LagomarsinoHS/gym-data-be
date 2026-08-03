import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export class GrantPremiumDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Target user email (unique)',
  })
  email: string;

  @ApiPropertyOptional({
    example: 30,
    description:
      'Days of premium from now (ignored if expiresAt is set). Default 30.',
  })
  durationDays?: number;

  @ApiPropertyOptional({
    example: '2026-09-03',
    description:
      'Expiry calendar day (YYYY-MM-DD). Access lasts until end of that day UTC (23:59:59.999).',
  })
  expiresAt?: string;
}

export const grantPremiumSchema = Joi.object<GrantPremiumDto>({
  email: Joi.string().trim().lowercase().email().required(),
  durationDays: Joi.number().integer().min(1).max(3650),
  expiresAt: Joi.string()
    .pattern(YMD)
    .custom((value: string, helpers) => {
      const [year, month, day] = value.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      const validCalendarDay =
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day;

      if (!validCalendarDay) {
        return helpers.error('any.invalid');
      }

      const endOfDay = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
      if (endOfDay <= Date.now()) {
        return helpers.message({
          custom:
            '"expiresAt" must be a future calendar day (UTC) in YYYY-MM-DD format',
        });
      }

      return value;
    }),
}).oxor('durationDays', 'expiresAt');
