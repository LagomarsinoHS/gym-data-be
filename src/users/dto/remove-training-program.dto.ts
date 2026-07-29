import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class RemoveTrainingProgramDto {
  @ApiProperty({
    example: '0001',
    description: 'Exercise business id to remove from the training program',
  })
  exerciseId: string;
}

export const removeTrainingProgramSchema = Joi.object<RemoveTrainingProgramDto>(
  {
    exerciseId: Joi.string().trim().min(1).required(),
  },
);
