import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class RevokePremiumDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Target user email (unique)',
  })
  email: string;
}

export const revokePremiumSchema = Joi.object<RevokePremiumDto>({
  email: Joi.string().trim().lowercase().email().required(),
});
