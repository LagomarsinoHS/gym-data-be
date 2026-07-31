import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export enum CoachInviteResponseAction {
  Accept = 'accept',
  Reject = 'reject',
}

export class RespondCoachInviteDto {
  @ApiProperty({
    enum: CoachInviteResponseAction,
    example: CoachInviteResponseAction.Accept,
  })
  action: CoachInviteResponseAction;
}

export const respondCoachInviteSchema = Joi.object<RespondCoachInviteDto>({
  action: Joi.string()
    .valid(...Object.values(CoachInviteResponseAction))
    .required(),
});
