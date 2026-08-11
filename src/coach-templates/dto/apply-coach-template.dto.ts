import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { MeCoachTrainingProgramDto } from '../../users/dto/me-response.dto';

export class ApplyCoachTemplateDto {
  @ApiProperty({
    type: [String],
    example: ['template-uuid-1', 'template-uuid-2'],
    description:
      'Template ids to copy (1-50). Session id on the athlete plan matches the template id.',
  })
  templateIds: string[];

  @ApiProperty({
    type: [String],
    example: ['athlete-uuid-1', 'athlete-uuid-2'],
    description: 'Athletes that should receive the templates (1-50).',
  })
  athleteIds: string[];
}

export class ApplyCoachTemplatePairDto {
  @ApiProperty({ example: 'athlete-uuid' })
  athleteId: string;

  @ApiProperty({ example: 'template-uuid' })
  templateId: string;
}

export class ApplyCoachTemplateResponseDto {
  @ApiProperty({
    type: [ApplyCoachTemplatePairDto],
    description: 'Pairs that were appended as sessions',
  })
  applied: ApplyCoachTemplatePairDto[];

  @ApiProperty({
    type: [ApplyCoachTemplatePairDto],
    description:
      'Pairs skipped because the athlete already had that session id',
  })
  skipped: ApplyCoachTemplatePairDto[];

  @ApiProperty({
    type: [String],
    description: 'Athlete ids that could not be updated (missing / not yours)',
  })
  failedAthletes: string[];

  @ApiProperty({
    type: [String],
    description: 'Template ids not found in the coach library',
  })
  failedTemplates: string[];

  @ApiProperty({
    type: [MeCoachTrainingProgramDto],
    description:
      'Enriched session payloads for templates that were applied at least once (unique by template id).',
  })
  sessions: MeCoachTrainingProgramDto[];
}

export const applyCoachTemplateSchema = Joi.object<ApplyCoachTemplateDto>({
  templateIds: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .max(50)
    .required(),
  athleteIds: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .max(50)
    .required(),
});
