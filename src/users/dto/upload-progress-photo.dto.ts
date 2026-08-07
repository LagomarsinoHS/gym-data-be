import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { currentYearMonth } from '../utils/year-month';

export enum ProgressPhotoSide {
  Front = 'front',
  Back = 'back',
}

export class UploadProgressPhotoDto {
  @ApiProperty({
    example: 72.5,
    description: 'Body weight in kg for this progress month (required with the photo(s))',
  })
  weightKg: number;

  @ApiPropertyOptional({
    example: '2026-07',
    description:
      'Optional month bucket (YYYY-MM). Omit to use the current UTC month. Future months are rejected.',
  })
  yearMonth?: string;
}

export const uploadProgressPhotoSchema = Joi.object<UploadProgressPhotoDto>({
  weightKg: Joi.number().min(20).max(400).precision(2).required().messages({
    'any.required': '"weightKg" is required',
    'number.base': '"weightKg" must be a number',
    'number.min': '"weightKg" must be at least 20',
    'number.max': '"weightKg" must be at most 400',
  }),
  yearMonth: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .empty('')
    .custom((value, helpers) => {
      if (value > currentYearMonth()) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'string.pattern.base': '"yearMonth" must be in YYYY-MM format',
      'any.invalid': '"yearMonth" cannot be in the future',
    }),
});
