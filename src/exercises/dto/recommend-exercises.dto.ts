import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { ExerciseName } from '../schemas/exercise.schema';

export type RecommendLocale = 'es' | 'en';

export const DEFAULT_RECOMMEND_LOCALE: RecommendLocale = 'es';

export class RecommendExercisesQueryDto {
  @ApiProperty({
    example: 'chest',
    description: 'Catalog category (same values as GET /exercises/labels → category)',
  })
  zone: string;

  @ApiProperty({
    example: 'barbell,dumbbell',
    description: '1 or 2 equipment values (comma-separated or repeated)',
  })
  equipment: string[];

  @ApiPropertyOptional({
    enum: ['es', 'en'],
    default: DEFAULT_RECOMMEND_LOCALE,
    description: 'UI language for the AI note (exercise names stay bilingual)',
  })
  locale: RecommendLocale;
}

export class RecommendExerciseDto {
  @ApiProperty({ example: '1316' })
  id: string;

  @ApiProperty({ type: ExerciseName })
  name: ExerciseName;

  @ApiPropertyOptional({ example: 'images/1316-mN.jpg' })
  image?: string;

  @ApiPropertyOptional({ example: 'videos/1316-omN.gif' })
  gif_url?: string;

  @ApiPropertyOptional({ example: 'chest' })
  category?: string;

  @ApiPropertyOptional({ example: 'barbell' })
  equipment?: string;

  @ApiPropertyOptional({ example: 'pectorals' })
  target?: string;

  @ApiProperty({ example: 3, description: 'Number of sets' })
  sets: number;

  @ApiProperty({ example: '8-10', description: 'Reps prescription' })
  reps: string;

  @ApiProperty({ example: 90, description: 'Rest between sets in seconds' })
  rest: number;
}

export class RecommendExercisesResponseDto {
  @ApiProperty({ example: 'chest' })
  zone: string;

  @ApiProperty({ example: ['barbell', 'dumbbell'], type: [String] })
  equipment: string[];

  @ApiProperty({ enum: ['es', 'en'], example: 'es' })
  locale: RecommendLocale;

  @ApiProperty({
    example:
      'Prioricé un empuje compuesto con barra, variación unilateral con mancuernas y asistencia de deltoides/tríceps para balancear el estímulo.',
  })
  note: string;

  @ApiProperty({ type: [RecommendExerciseDto] })
  exercises: RecommendExerciseDto[];
}

export const recommendExercisesQuerySchema = Joi.object<RecommendExercisesQueryDto>({
  zone: Joi.string().trim().min(1).required(),
  equipment: Joi.any()
    .custom((value, helpers) => {
      const items = parseEquipment(value);
      if (items.length < 1 || items.length > 2) {
        return helpers.error('any.invalid');
      }
      return items;
    })
    .required()
    .messages({
      'any.invalid': 'equipment must include 1 or 2 values',
    }),
  locale: Joi.string().valid('es', 'en').default(DEFAULT_RECOMMEND_LOCALE).optional(),
});

function parseEquipment(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .flatMap((item) => String(item).split(','))
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }
  if (typeof value === 'string') {
    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }
  return [];
}
