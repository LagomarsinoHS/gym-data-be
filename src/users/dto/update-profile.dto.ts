import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Humberto' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lagomarsino' })
  lastName?: string;

  @ApiPropertyOptional({
    example: 'currentSecret',
    description: 'Required when changing password',
  })
  currentPassword?: string;

  @ApiPropertyOptional({
    example: 'newSecret',
    description: 'Min 4 chars. Requires currentPassword + confirmNewPassword',
  })
  newPassword?: string;

  @ApiPropertyOptional({
    example: 'newSecret',
    description: 'Must match newPassword',
  })
  confirmNewPassword?: string;
}

export const updateProfileSchema = Joi.object<UpdateProfileDto>({
  firstName: Joi.string().trim().min(1).optional(),
  lastName: Joi.string().trim().min(1).optional(),
  currentPassword: Joi.string().min(1).optional(),
  newPassword: Joi.string().min(4).optional(),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .when('newPassword', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.only': '"confirmNewPassword" must match "newPassword"',
    }),
})
  .with('newPassword', 'currentPassword')
  .or('firstName', 'lastName', 'newPassword')
  .messages({
    'object.missing':
      'Provide at least one of firstName, lastName, or newPassword',
  });
