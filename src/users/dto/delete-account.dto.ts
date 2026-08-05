import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'user@example.com',
    description:
      'Email of the account to soft-delete. Must match the authenticated user.',
  })
  email: string;
}

export const deleteAccountSchema = Joi.object<DeleteAccountDto>({
  email: Joi.string().trim().lowercase().email().required(),
});
