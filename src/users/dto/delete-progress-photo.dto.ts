import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { ProgressPhotoSide } from './upload-progress-photo.dto';

export class DeleteProgressPhotoDto {
  @ApiProperty({
    example: '2026-08',
    description: 'Month bucket to delete from (YYYY-MM)',
  })
  yearMonth: string;

  @ApiPropertyOptional({
    enum: ProgressPhotoSide,
    example: ProgressPhotoSide.Front,
    description:
      'If omitted, deletes the whole month (front + back + Cloudinary folder). If set, deletes only that side.',
  })
  side?: ProgressPhotoSide;
}

export const deleteProgressPhotoSchema = Joi.object<DeleteProgressPhotoDto>({
  yearMonth: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .required()
    .messages({
      'string.pattern.base': '"yearMonth" must be in YYYY-MM format',
    }),
  side: Joi.string()
    .valid(...Object.values(ProgressPhotoSide))
    .optional(),
});
