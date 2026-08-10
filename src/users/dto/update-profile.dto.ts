import { ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { UserGoal } from '../types/user-goal.enum';
import { UserSex } from '../types/user-sex.enum';

export class UpdateProfileFieldsDto {
  @ApiPropertyOptional({ example: 'Humberto' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lagomarsino' })
  lastName?: string;

  @ApiPropertyOptional({
    example: 175,
    nullable: true,
    description: 'Height in cm. null clears the value.',
  })
  heightCm?: number | null;

  @ApiPropertyOptional({
    enum: UserSex,
    nullable: true,
    description: 'null clears the value.',
  })
  sex?: UserSex | null;

  @ApiPropertyOptional({
    example: '1995-06-15',
    nullable: true,
    description: 'YYYY-MM-DD. null clears the value.',
  })
  birthDate?: string | null;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    type: UpdateProfileFieldsDto,
    description: 'Personal profile fields (partial)',
  })
  profile?: UpdateProfileFieldsDto;

  @ApiPropertyOptional({
    enum: UserGoal,
    nullable: true,
    description: 'null clears the value.',
  })
  goal?: UserGoal | null;

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

const birthDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const profilePatchSchema = Joi.object({
  firstName: Joi.string().trim().min(1).optional(),
  lastName: Joi.string().trim().min(1).optional(),
  heightCm: Joi.number().integer().min(50).max(300).allow(null).optional(),
  sex: Joi.string()
    .valid(...Object.values(UserSex))
    .allow(null)
    .optional(),
  birthDate: Joi.string()
    .pattern(birthDatePattern)
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': '"birthDate" must be YYYY-MM-DD',
    }),
}).min(1);

export const updateProfileSchema = Joi.object<UpdateProfileDto>({
  profile: profilePatchSchema.optional(),
  goal: Joi.string()
    .valid(...Object.values(UserGoal))
    .allow(null)
    .optional(),
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
  .or('profile', 'goal', 'newPassword')
  .messages({
    'object.missing':
      'Provide at least one of profile, goal, or newPassword to update',
  });
