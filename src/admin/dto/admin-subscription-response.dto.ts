import { ApiProperty } from '@nestjs/swagger';
import { MeSubscriptionDto } from '../../users/dto/me-response.dto';
import { Role } from '../../users/types/role.enum';

/** Slim result of admin grant / revoke — not the full `/users/me` payload. */
export class AdminSubscriptionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.Athlete })
  role: Role;

  @ApiProperty({ type: MeSubscriptionDto })
  subscription: MeSubscriptionDto;
}
