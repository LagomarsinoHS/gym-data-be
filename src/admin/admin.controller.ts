import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { MeResponseDto } from '../users/dto/me-response.dto';
import { Role } from '../users/types/role.enum';
import { AdminService } from './admin.service';
import { GrantPremiumDto, grantPremiumSchema } from './dto/grant-premium.dto';
import {
  RevokePremiumDto,
  revokePremiumSchema,
} from './dto/revoke-premium.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard /* RolesGuard */)
@Roles(Role.Admin)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('subscriptions/grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant paid subscription',
    description:
      'Requires admin role. Body needs email + plan (premium | growth | pro). Default duration 30 days unless expiresAt/durationDays is set.',
  })
  @ApiBody({ type: GrantPremiumDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'User not found' })
  grantPremium(
    @Body(new JoiValidationPipe(grantPremiumSchema)) dto: GrantPremiumDto,
  ): Promise<MeResponseDto> {
    return this.adminService.grantPremium(dto);
  }

  @Post('subscriptions/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke premium subscription',
    description:
      'Requires admin role. Body needs email. Sets plan to free and clears dates.',
  })
  @ApiBody({ type: RevokePremiumDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'User not found' })
  revokePremium(
    @Body(new JoiValidationPipe(revokePremiumSchema)) dto: RevokePremiumDto,
  ): Promise<MeResponseDto> {
    return this.adminService.revokePremium(dto);
  }
}
