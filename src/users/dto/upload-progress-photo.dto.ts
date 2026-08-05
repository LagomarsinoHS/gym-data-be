import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export enum ProgressPhotoSide {
  Front = 'front',
  Back = 'back',
}

export class UploadProgressPhotoDto {
  @ApiProperty({
    example: 72.5,
    description:
      'Body weight in kg for this progress month (required with the photo(s))',
  })
  weightKg: number;
}

export const uploadProgressPhotoSchema = Joi.object<UploadProgressPhotoDto>({
  weightKg: Joi.number().min(20).max(400).precision(2).required().messages({
    'any.required': '"weightKg" is required',
    'number.base': '"weightKg" must be a number',
    'number.min': '"weightKg" must be at least 20',
    'number.max': '"weightKg" must be at most 400',
  }),
});
