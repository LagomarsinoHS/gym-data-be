import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { Role } from '../../users/types/role.enum';

/** Roles allowed on public registration (admin is created in DB only). */
export const REGISTER_ROLES = [Role.Athlete, Role.Coach] as const;
export type RegisterRole = (typeof REGISTER_ROLES)[number];

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Humberto' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'examplePassword' })
  password: string;

  @ApiPropertyOptional({
    enum: REGISTER_ROLES,
    example: Role.Athlete,
    default: Role.Athlete,
    description: 'Public roles only. Admin must be created directly in the DB.',
  })
  role: RegisterRole;
}

export const registerSchema = Joi.object<RegisterDto>({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(4).required(),
  firstName: Joi.string().trim().min(1).required(),
  lastName: Joi.string().trim().min(1).required(),
  role: Joi.string()
    .valid(...REGISTER_ROLES)
    .default(Role.Athlete),
});
