import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseName } from '../../exercises/schemas/exercise.schema';
import { Role } from '../types/role.enum';

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

  @ApiPropertyOptional({
    type: MeExerciseSummaryDto,
    nullable: true,
    description: 'Catalog exercise resolved by exerciseId',
  })
  exercise: MeExerciseSummaryDto | null;
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

  @ApiProperty({ type: [MeTrainingProgramItemDto] })
  trainingProgram: MeTrainingProgramItemDto[];

  @ApiPropertyOptional({ example: '2026-07-28T22:35:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-07-28T22:35:00.000Z' })
  updatedAt?: Date;
}
