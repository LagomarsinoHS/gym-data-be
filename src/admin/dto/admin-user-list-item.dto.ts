import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeSubscriptionDto } from '../../users/dto/me-response.dto';
import { Role } from '../../users/types/role.enum';
import { UserGoal } from '../../users/types/user-goal.enum';
import { UserSex } from '../../users/types/user-sex.enum';

export class AdminUserProfileDto {
  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'García' })
  lastName: string;

  @ApiPropertyOptional({ example: 165, nullable: true })
  heightCm: number | null;

  @ApiPropertyOptional({ enum: UserSex, nullable: true })
  sex: UserSex | null;

  @ApiPropertyOptional({ example: '1995-06-15', nullable: true })
  birthDate: string | null;
}

/** Slim row for admin user list (no password / programs / photos). */
export class AdminUserListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.Athlete })
  role: Role;

  @ApiProperty({ type: AdminUserProfileDto })
  profile: AdminUserProfileDto;

  @ApiPropertyOptional({ enum: UserGoal, nullable: true })
  goal: UserGoal | null;

  @ApiProperty({ type: MeSubscriptionDto })
  subscription: MeSubscriptionDto;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Assigned coach user id, if any',
  })
  coachId: string | null;

  @ApiProperty({
    example: '2026-08-12T18:00:00.000Z',
    description: 'Last successful login or registration',
  })
  lastLoginAt: Date;

  @ApiProperty({ example: '2026-01-15T12:00:00.000Z' })
  createdAt: Date;
}
