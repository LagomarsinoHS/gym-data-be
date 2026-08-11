import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

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
}

export const applyCoachTemplateSchema = Joi.object<ApplyCoachTemplateDto>({
  athleteIds: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .max(50)
    .required(),
});
