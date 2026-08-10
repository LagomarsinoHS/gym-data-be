import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class RevokeSubscriptionDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Target user email (unique)',
  })
  email: string;
}

export const revokeSubscriptionSchema = Joi.object<RevokeSubscriptionDto>({
  email: Joi.string().trim().lowercase().email().required(),
});
