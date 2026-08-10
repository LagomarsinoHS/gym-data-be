import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class AddTrainingProgramDto {
  @ApiProperty({
    example: ['0001', '0003'],
    description: 'Exercise business ids to add to the training program',
    type: [String],
    minItems: 1,
  })
  exerciseIds: string[];
}

export const addTrainingProgramSchema = Joi.object<AddTrainingProgramDto>({
  exerciseIds: Joi.array()
    .items(Joi.string().trim().min(1).required())
    .min(1)
    .required(),
});
