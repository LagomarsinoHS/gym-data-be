import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export type AnalyzeProgressPhotosLocale = 'es' | 'en';

export const DEFAULT_ANALYZE_PROGRESS_LOCALE: AnalyzeProgressPhotosLocale = 'es';

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
    description: 'Language for the AI analysis JSON content',
  })
  locale: AnalyzeProgressPhotosLocale;
}

export class AnalyzeProgressParagraphBlockDto {
  @ApiProperty({ enum: ['paragraph'] })
  type: 'paragraph';

  @ApiProperty({ example: 'Resumen general del progreso observado.' })
  text: string;
}

export class AnalyzeProgressSubtitleBlockDto {
  @ApiProperty({ enum: ['subtitle'] })
  type: 'subtitle';

  @ApiProperty({ example: 'Desarrollo del pecho' })
  title: string;

  @ApiProperty({ example: 'Se observa mayor volumen en la porción clavicular…' })
  text: string;
}

export class AnalyzeProgressSectionDto {
  @ApiProperty({ example: 'Análisis General' })
  title: string;

  @ApiProperty({
    description: 'Ordered content blocks for this section',
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/AnalyzeProgressParagraphBlockDto' },
        { $ref: '#/components/schemas/AnalyzeProgressSubtitleBlockDto' },
      ],
    },
  })
  blocks: Array<AnalyzeProgressParagraphBlockDto | AnalyzeProgressSubtitleBlockDto>;
}

export class AnalyzeProgressPhotosResponseDto {
  @ApiProperty({
    type: [AnalyzeProgressSectionDto],
    description: 'Structured progress analysis sections from the AI',
  })
  sections: AnalyzeProgressSectionDto[];
}

export const analyzeProgressPhotosSchema = Joi.object<AnalyzeProgressPhotosDto>({
  yearMonths: Joi.array()
    .items(Joi.string().trim().pattern(YEAR_MONTH_PATTERN).required())
    .length(2)
    .unique()
    .required()
    .messages({
      'array.length': 'yearMonths must contain exactly 2 months',
      'array.unique': 'yearMonths must be two distinct months',
    }),
  locale: Joi.string().valid('es', 'en').default(DEFAULT_ANALYZE_PROGRESS_LOCALE).optional(),
});
