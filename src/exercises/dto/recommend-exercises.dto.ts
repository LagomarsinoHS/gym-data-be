import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { RECOMMEND_ZONES } from '../constants/zone-presets';
import { ExerciseName } from '../schemas/exercise.schema';

export class RecommendExercisesQueryDto {
  @ApiProperty({
    example: 'back',
    enum: RECOMMEND_ZONES,
    description: 'Catalog category / zone preset key',
  })
  zone: string;

  @ApiProperty({
    example: 'barbell,dumbbell',
    description:
      'Available equipment (comma-separated or repeated query param)',
  })
  equipment: string[];
}

export class RecommendExerciseSummaryDto {
  @ApiProperty({ example: '1316' })
  id: string;

  @ApiProperty({ type: ExerciseName })
  name: ExerciseName;

  @ApiPropertyOptional({ example: 'images/1316-mN.jpg' })
  image?: string;

  @ApiPropertyOptional({ example: 'videos/1316-omN.gif' })
  gif_url?: string;

  @ApiPropertyOptional({ example: 'back' })
  category?: string;

  @ApiPropertyOptional({ example: 'barbell' })
  equipment?: string;
}

export class RecommendedExerciseDto {
  @ApiProperty({ example: 'vertical_pull' })
  role: string;

  @ApiProperty({ type: RecommendExerciseSummaryDto })
  exercise: RecommendExerciseSummaryDto;
}

export class RecommendExercisesResponseDto {
  @ApiProperty({ example: 'back' })
  zone: string;

  @ApiProperty({ example: ['barbell'], type: [String] })
  equipment: string[];

  @ApiProperty({ type: [RecommendedExerciseDto] })
  exercises: RecommendedExerciseDto[];
}

export const recommendExercisesQuerySchema =
  Joi.object<RecommendExercisesQueryDto>({
    zone: Joi.string()
      .trim()
      .valid(...RECOMMEND_ZONES)
      .required(),
    equipment: Joi.any()
      .custom((value, helpers) => {
        const items = parseEquipment(value);
        if (items.length === 0) {
          return helpers.error('any.invalid');
        }
        return items;
      })
      .required()
      .messages({
        'any.invalid': 'equipment must include at least one value',
      }),
  });

function parseEquipment(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
