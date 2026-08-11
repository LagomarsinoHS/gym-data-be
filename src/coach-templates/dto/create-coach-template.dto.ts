import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { MeCoachTrainingProgramDto } from '../../users/dto/me-response.dto';
import { CoachTrainingProgramItemDto } from '../../users/dto/set-coach-training-program.dto';
import { coachTemplateItemSchema } from './set-coach-templates.dto';

export class CreateCoachTemplateDto {
  @ApiProperty({ example: 'Upper Body', maxLength: 80 })
  name: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Position in the templates list. Defaults to append at end.',
  })
  order?: number;

  @ApiPropertyOptional({
    type: [Object],
    description:
      'Optional items (exerciseId only). Defaults to []. Template id is always assigned by the server.',
  })
  items?: CoachTrainingProgramItemDto[];
}

export class CreateCoachTemplateResponseDto {
  @ApiProperty({ type: MeCoachTrainingProgramDto })
  template: MeCoachTrainingProgramDto;
}

export const createCoachTemplateSchema = Joi.object<CreateCoachTemplateDto>({
  name: Joi.string().trim().min(1).max(80).required(),
  order: Joi.number().integer().min(0).optional(),
  items: Joi.array().items(coachTemplateItemSchema).optional(),
});
