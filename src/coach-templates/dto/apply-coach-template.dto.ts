import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { MeCoachTrainingProgramDto } from '../../users/dto/me-response.dto';

export class ApplyCoachTemplateDto {
  @ApiProperty({
    type: [String],
    example: ['athlete-uuid-1', 'athlete-uuid-2'],
    description: 'Athletes that should receive a copy of this template as a new session.',
  })
  athleteIds: string[];
}

export class ApplyCoachTemplateResponseDto {
  @ApiProperty({ type: [String], description: 'Athletes that received the session' })
  applied: string[];

  @ApiProperty({
    type: [String],
    description: 'Athletes that already had a session with this template id',
  })
  skipped: string[];

  @ApiProperty({
    type: [String],
    description: 'Athlete ids that could not be updated (missing / not yours)',
  })
  failed: string[];

  @ApiProperty({
    type: MeCoachTrainingProgramDto,
    description:
      'Enriched session copy that was (or would be) appended. Same for all athletes; each athlete gets order = their plan length at apply time.',
  })
  session: MeCoachTrainingProgramDto;
}

export const applyCoachTemplateSchema = Joi.object<ApplyCoachTemplateDto>({
  athleteIds: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .max(50)
    .required(),
});
