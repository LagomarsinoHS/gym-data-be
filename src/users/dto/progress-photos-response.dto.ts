import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressPhotoPublicDto } from './upload-progress-photo-response.dto';

export class ProgressPhotoMonthDto {
  @ApiProperty({ example: 8, description: 'Month number 1–12' })
  month: number;

  @ApiProperty({ example: '2026-08' })
  yearMonth: string;

  @ApiPropertyOptional({ type: ProgressPhotoPublicDto, nullable: true })
  front: ProgressPhotoPublicDto | null;

  @ApiPropertyOptional({ type: ProgressPhotoPublicDto, nullable: true })
  back: ProgressPhotoPublicDto | null;
}

export class ProgressPhotoYearDto {
  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ type: [ProgressPhotoMonthDto] })
  months: ProgressPhotoMonthDto[];
}

export class ProgressPhotosResponseDto {
  @ApiProperty({ type: [ProgressPhotoYearDto] })
  years: ProgressPhotoYearDto[];
}
