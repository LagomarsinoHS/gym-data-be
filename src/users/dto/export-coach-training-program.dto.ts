import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  DEFAULT_EXCEL_LOCALE,
  type ExcelLocale,
} from '../../excel/constants/excel-training-program-headers';

export class ExportCoachTrainingProgramDto {
  @ApiProperty({
    type: [String],
    description:
      'Athlete ids to export. Empty array exports all athletes assigned to the coach.',
    example: ['ee923be1-1192-460e-89ee-2275d4d3f206'],
  })
  athleteIds: string[];

  @ApiPropertyOptional({
    enum: ['es', 'en'],
    default: DEFAULT_EXCEL_LOCALE,
    description: 'Locale for Excel headers and exercise names',
  })
  locale?: ExcelLocale;
}

export const exportCoachTrainingProgramSchema =
  Joi.object<ExportCoachTrainingProgramDto>({
    athleteIds: Joi.array().items(Joi.string().trim().min(1)).required(),
    locale: Joi.string()
      .valid('es', 'en')
      .default(DEFAULT_EXCEL_LOCALE)
      .optional(),
  }).required();
