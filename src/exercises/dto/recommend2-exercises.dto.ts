import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { RECOMMEND_ZONES } from '../constants/zone-presets';
import { ExerciseName } from '../schemas/exercise.schema';

export type Recommend2Locale = 'es' | 'en';

export const DEFAULT_RECOMMEND2_LOCALE: Recommend2Locale = 'es';

export class Recommend2QueryDto {
  @ApiProperty({
    example: 'chest',
    enum: RECOMMEND_ZONES,
    description: 'Catalog category / zone',
  })
  zone: string;

  @ApiProperty({
    example: 'barbell,dumbbell',
    description: '1 or 2 equipment values (comma-separated or repeated)',
  })
  equipment: string[];

  @ApiPropertyOptional({
    enum: ['es', 'en'],
    default: DEFAULT_RECOMMEND2_LOCALE,
    description:
      'UI language for the OpenAI note (exercise names stay bilingual)',
  })
  locale: Recommend2Locale;
}

export class Recommend2ExerciseDto {
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
}

export class Recommend2ResponseDto {
  @ApiProperty({ example: 'chest' })
  zone: string;

  @ApiProperty({ example: ['barbell', 'dumbbell'], type: [String] })
  equipment: string[];

  @ApiProperty({ enum: ['es', 'en'], example: 'es' })
  locale: Recommend2Locale;

  @ApiProperty({
    example:
      'Prioricé un empuje compuesto con barra, variación unilateral con mancuernas y asistencia de deltoides/tríceps para balancear el estímulo.',
  })
  note: string;

  @ApiProperty({ type: [Recommend2ExerciseDto] })
  exercises: Recommend2ExerciseDto[];
}

export const recommend2QuerySchema = Joi.object<Recommend2QueryDto>({
  zone: Joi.string()
    .trim()
    .valid(...RECOMMEND_ZONES)
    .required(),
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
  locale: Joi.string()
    .valid('es', 'en')
    .default(DEFAULT_RECOMMEND2_LOCALE)
    .optional(),
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
