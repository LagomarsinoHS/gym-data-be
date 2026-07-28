import { ApiProperty } from '@nestjs/swagger';

export class ExerciseLabelsResponseDto {
  @ApiProperty({ type: [String], example: ['waist', 'back', 'chest'] })
  category: string[];

  @ApiProperty({ type: [String], example: ['body weight', 'barbell'] })
  equipment: string[];

  @ApiProperty({ type: [String], example: ['abs', 'biceps'] })
  target: string[];
}
