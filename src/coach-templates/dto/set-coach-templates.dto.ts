import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { MeCoachTrainingProgramDto } from '../../users/dto/me-response.dto';
import {
  CoachTrainingProgramDto,
  CoachTrainingProgramItemDto,
} from '../../users/dto/set-coach-training-program.dto';

export class SetCoachTemplatesDto {
  @ApiProperty({
    type: [CoachTrainingProgramDto],
    description:
      'Full coachTemplates array (replace). Same shape as a coachTrainingProgram session. Send exerciseId only per item.',
  })
  coachTemplates: CoachTrainingProgramDto[];
}

export class CoachTemplatesResponseDto {
  @ApiProperty({ type: [MeCoachTrainingProgramDto] })
  coachTemplates: MeCoachTrainingProgramDto[];
}

const itemSchema = Joi.object<CoachTrainingProgramItemDto>({
  exerciseId: Joi.string().trim().min(1).required(),
  order: Joi.number().integer().min(0).optional(),
  sets: Joi.number().integer().min(1).optional(),
  reps: Joi.string().trim().min(1).optional(),
  rest: Joi.number().integer().min(0).optional(),
  notes: Joi.string().trim().allow('').optional(),
});

const coachTemplateSchema = Joi.object<CoachTrainingProgramDto>({
  id: Joi.string().trim().min(1).required(),
  name: Joi.string().trim().min(1).max(80).required(),
  order: Joi.number().integer().min(0).required(),
  items: Joi.array().items(itemSchema).required(),
});

export const setCoachTemplatesSchema = Joi.object<SetCoachTemplatesDto>({
  coachTemplates: Joi.array().items(coachTemplateSchema).required(),
});

export { itemSchema as coachTemplateItemSchema };
