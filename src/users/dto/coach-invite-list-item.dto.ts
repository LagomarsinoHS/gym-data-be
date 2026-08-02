import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InviteStatus } from '../types/invite-status.enum';

export class CoachInviteAthleteSummaryDto {
  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'García' })
  lastName: string;
}

export class CoachInviteListItemDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  id: string;

  @ApiProperty({ example: 'ee923be1-1192-460e-89ee-2275d4d3f206' })
  athleteId: string;

  @ApiProperty({ example: 'athlete@example.com' })
  email: string;

  @ApiProperty({ enum: InviteStatus, example: InviteStatus.Pending })
  status: InviteStatus;

  @ApiProperty({ example: '2026-08-02T18:00:00.000Z' })
  invitedAt: Date;

  @ApiPropertyOptional({
    example: '2026-08-03T12:00:00.000Z',
    nullable: true,
  })
  respondedAt: Date | null;

  @ApiPropertyOptional({
    type: CoachInviteAthleteSummaryDto,
    nullable: true,
    description: 'Athlete profile when the user still exists',
  })
  athlete: CoachInviteAthleteSummaryDto | null;
}
