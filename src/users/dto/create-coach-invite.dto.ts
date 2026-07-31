import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class CreateCoachInviteDto {
  @ApiProperty({ example: 'athlete@example.com' })
  email: string;
}

export const createCoachInviteSchema = Joi.object<CreateCoachInviteDto>({
  email: Joi.string().trim().lowercase().email().required(),
});
