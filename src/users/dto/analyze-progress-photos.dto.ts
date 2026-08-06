import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export type AnalyzeProgressPhotosLocale = 'es' | 'en';

export const DEFAULT_ANALYZE_PROGRESS_LOCALE: AnalyzeProgressPhotosLocale =
  'es';

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class AnalyzeProgressPhotosDto {
  @ApiProperty({
    example: ['2026-08', '2026-09'],
    description: 'Exactly two distinct YYYY-MM months to compare',
    type: [String],
  })
  yearMonths: [string, string];

  @ApiPropertyOptional({
    enum: ['es', 'en'],
    default: DEFAULT_ANALYZE_PROGRESS_LOCALE,
    description: 'Language for the AI analysis text',
  })
  locale: AnalyzeProgressPhotosLocale;
}

export class AnalyzeProgressPhotosResponseDto {
  @ApiProperty({
    example:
      'Se observa mejor definición en torso y espalda… En frente… En espalda…',
    description: 'Full free-form analysis text returned by OpenAI',
  })
  analysis: string;
}

export const analyzeProgressPhotosSchema = Joi.object<AnalyzeProgressPhotosDto>(
  {
    yearMonths: Joi.array()
      .items(Joi.string().trim().pattern(YEAR_MONTH_PATTERN).required())
      .length(2)
      .unique()
      .required()
      .messages({
        'array.length': 'yearMonths must contain exactly 2 months',
        'array.unique': 'yearMonths must be two distinct months',
      }),
    locale: Joi.string()
      .valid('es', 'en')
      .default(DEFAULT_ANALYZE_PROGRESS_LOCALE)
      .optional(),
  },
);
