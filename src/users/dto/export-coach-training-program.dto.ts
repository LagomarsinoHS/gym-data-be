import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  DEFAULT_EXPORT_LOCALE,
  type ExportLocale,
} from '../../common/export/training-program-export-headers';
import {
  DEFAULT_EXPORT_FORMAT,
  type ExportCoachTrainingProgramFormat,
} from '../types/export-coach-training-program-format';

export {
  DEFAULT_EXPORT_FORMAT,
  type ExportCoachTrainingProgramFormat,
} from '../types/export-coach-training-program-format';

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
    default: DEFAULT_EXPORT_LOCALE,
    description: 'Locale for headers and exercise names',
  })
  locale?: ExportLocale;

  @ApiPropertyOptional({
    enum: ['xlsx', 'pdf'],
    default: DEFAULT_EXPORT_FORMAT,
    description: 'File format: Excel workbook or PDF (print-ready)',
  })
  format?: ExportCoachTrainingProgramFormat;
}

export const exportCoachTrainingProgramSchema =
  Joi.object<ExportCoachTrainingProgramDto>({
    athleteIds: Joi.array().items(Joi.string().trim().min(1)).required(),
    locale: Joi.string()
      .valid('es', 'en')
      .default(DEFAULT_EXPORT_LOCALE)
      .optional(),
    format: Joi.string()
      .valid('xlsx', 'pdf')
      .default(DEFAULT_EXPORT_FORMAT)
      .optional(),
  }).required();
