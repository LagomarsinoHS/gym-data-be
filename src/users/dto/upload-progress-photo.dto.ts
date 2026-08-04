import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export enum ProgressPhotoSide {
  Front = 'front',
  Back = 'back',
}

export class UploadProgressPhotoDto {
  @ApiProperty({
    enum: ProgressPhotoSide,
    example: ProgressPhotoSide.Front,
    description: 'Which side of the monthly progress pair',
  })
  side: ProgressPhotoSide;
}

export const uploadProgressPhotoSchema = Joi.object<UploadProgressPhotoDto>({
  side: Joi.string()
    .valid(...Object.values(ProgressPhotoSide))
    .required(),
});
