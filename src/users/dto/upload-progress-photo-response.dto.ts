import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProgressPhotoPublicDto {
  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/progress/user/front.png',
  })
  url: string;

  @ApiProperty({ example: '2026-08-04T18:00:00.000Z' })
  uploadedAt: Date;
}

export class UploadProgressPhotoResponseDto {
  @ApiProperty({ example: '2026-08' })
  yearMonth: string;

  @ApiPropertyOptional({
    type: ProgressPhotoPublicDto,
    nullable: true,
    description: 'Front photo for the month after this upload',
  })
  front: ProgressPhotoPublicDto | null;

  @ApiPropertyOptional({
    type: ProgressPhotoPublicDto,
    nullable: true,
    description: 'Back photo for the month after this upload',
  })
  back: ProgressPhotoPublicDto | null;
}
