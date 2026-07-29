import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'examplePassword' })
  password: string;
}

export const loginSchema = Joi.object<LoginDto>({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(4).required(),
});
