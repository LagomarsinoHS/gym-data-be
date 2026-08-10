import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeCoachTrainingProgramDto, MeProfileDto } from './me-response.dto';
import { UserGoal } from '../types/user-goal.enum';

/**
 * Slim athlete row for `GET /users/coach/athletes`.
 * Omits trainingProgram, subscription, coachQuota, profilePhoto, etc.
 */
export class CoachAthleteListItemDto {
  @ApiProperty({ example: '05549aab-26fa-4b13-9528-513cae92be14' })
  id: string;

  @ApiProperty({ example: 'athlete@example.com' })
  email: string;

  @ApiProperty({ type: MeProfileDto })
  profile: MeProfileDto;

  @ApiPropertyOptional({
    enum: UserGoal,
    nullable: true,
    description: 'Training goal (top-level)',
  })
  goal: UserGoal | null;

  @ApiPropertyOptional({
    example: 72.5,
    nullable: true,
    description: 'Latest weight from progress photos',
  })
  currentWeightKg: number | null;

  @ApiProperty({ type: [MeCoachTrainingProgramDto] })
  coachTrainingProgram: MeCoachTrainingProgramDto[];
}
