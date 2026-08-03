import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseName } from '../../exercises/schemas/exercise.schema';
import { Role } from '../types/role.enum';
import { SubscriptionPlan } from '../types/subscription-plan.enum';

export class MeSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.Free })
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'When the current paid period started',
  })
  startedAt: Date | null;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'When premium access ends',
  })
  expiresAt: Date | null;
}

export class MeCoachQuotaDto {
  @ApiProperty({
    example: 5,
    description: 'Max assigned athletes for current plan',
  })
  athleteLimit: number;

  @ApiProperty({
    example: 3,
    description: 'Athletes currently assigned (coachId)',
  })
  athleteCount: number;

  @ApiProperty({
    example: true,
    description: 'Whether the coach can send another invite',
  })
  canInvite: boolean;
}

export class MeExerciseSummaryDto {
  @ApiProperty({ example: '0001' })
  id: string;

  @ApiProperty({ type: ExerciseName })
  name: ExerciseName;

  @ApiPropertyOptional({ example: 'images/0001-2gPfomN.jpg' })
  image?: string;

  @ApiPropertyOptional({ example: 'videos/0001-2gPfomN.gif' })
  gif_url?: string;

  @ApiPropertyOptional({ example: 'Cardio' })
  category?: string;

  @ApiPropertyOptional({ example: 'Barbell' })
  equipment?: string;
}

export class MeTrainingProgramItemDto {
  @ApiProperty({ example: '0001' })
  exerciseId: string;

  @ApiPropertyOptional({ example: 1 })
  order?: number;

  @ApiPropertyOptional({ example: 3 })
  sets?: number;

  @ApiPropertyOptional({ example: '10-12' })
  reps?: string;

  @ApiPropertyOptional({ example: 60 })
  rest?: number;

  @ApiPropertyOptional({ example: 'Controlar la bajada' })
  notes?: string;

  @ApiProperty({
    type: MeExerciseSummaryDto,
    description: 'Catalog exercise resolved by exerciseId',
  })
  exercise: MeExerciseSummaryDto;
}

export class MeCoachTrainingProgramDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  id: string;

  @ApiProperty({ example: 'Día A - Empuje' })
  name: string;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ type: [MeTrainingProgramItemDto] })
  items: MeTrainingProgramItemDto[];
}

export class MePendingCoachSummaryDto {
  @ApiProperty({ example: 'Carlos' })
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  lastName: string;
}

export class MePendingCoachInviteDto {
  @ApiProperty({ example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  coachId: string;

  @ApiProperty({ example: '2026-07-28T22:35:00.000Z' })
  invitedAt: Date;

  @ApiProperty({ type: MePendingCoachSummaryDto })
  coach: MePendingCoachSummaryDto;
}

/** Always an object so “no pending” is explicit JSON, not an empty body. */
export class PendingCoachInviteResponseDto {
  @ApiPropertyOptional({
    type: MePendingCoachInviteDto,
    nullable: true,
    description: 'At most one pending invite for the athlete',
  })
  invite: MePendingCoachInviteDto | null;
}

export class MeResponseDto {
  @ApiProperty({ example: '05549aab-26fa-4b13-9528-513cae92be14' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Humberto' })
  firstName: string;

  @ApiProperty({ example: 'Lagomarsino' })
  lastName: string;

  @ApiProperty({ enum: Role, example: Role.Athlete })
  role: Role;

  @ApiPropertyOptional({ example: null, nullable: true })
  coachId: string | null;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ type: MeSubscriptionDto })
  subscription: MeSubscriptionDto;

  @ApiPropertyOptional({
    type: MeCoachQuotaDto,
    nullable: true,
    description: 'Present for coaches; null for athletes/admins',
  })
  coachQuota: MeCoachQuotaDto | null;

  @ApiProperty({ type: [MeTrainingProgramItemDto] })
  trainingProgram: MeTrainingProgramItemDto[];

  @ApiProperty({ type: [MeCoachTrainingProgramDto] })
  coachTrainingProgram: MeCoachTrainingProgramDto[];

  @ApiPropertyOptional({ example: '2026-07-28T22:35:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-07-28T22:35:00.000Z' })
  updatedAt?: Date;
}
