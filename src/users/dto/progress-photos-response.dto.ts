import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressPhotoPublicDto } from './upload-progress-photo-response.dto';

export class ProgressPhotoMonthDto {
  @ApiProperty({ example: 8, description: 'Month number 1–12' })
  month: number;

  @ApiProperty({ example: '2026-08' })
  yearMonth: string;

  @ApiPropertyOptional({
    example: 72.5,
    nullable: true,
    description: 'Weight in kg for this month, if recorded',
  })
  weightKg: number | null;

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
  @ApiPropertyOptional({
    example: 72.5,
    nullable: true,
    description: 'Latest weight from progress months (newest yearMonth with weightKg)',
  })
  currentWeightKg: number | null;

  @ApiProperty({ type: [ProgressPhotoYearDto] })
  years: ProgressPhotoYearDto[];
}
