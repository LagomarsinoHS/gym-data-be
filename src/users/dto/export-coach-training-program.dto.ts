import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import {
  DEFAULT_EXCEL_LOCALE,
  type ExcelLocale,
} from '../../excel/constants/excel-training-program-headers';

export type ExportCoachTrainingProgramFormat = 'xlsx' | 'pdf';

export const DEFAULT_EXPORT_FORMAT: ExportCoachTrainingProgramFormat = 'xlsx';

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
    description: 'Locale for headers and exercise names',
  })
  locale?: ExcelLocale;

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
      .default(DEFAULT_EXCEL_LOCALE)
      .optional(),
    format: Joi.string()
      .valid('xlsx', 'pdf')
      .default(DEFAULT_EXPORT_FORMAT)
      .optional(),
  }).required();
