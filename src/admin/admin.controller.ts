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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { MeResponseDto } from '../users/dto/me-response.dto';
import { AdminService } from './admin.service';
import { GrantPremiumDto, grantPremiumSchema } from './dto/grant-premium.dto';
import {
  RevokePremiumDto,
  revokePremiumSchema,
} from './dto/revoke-premium.dto';

/**
 * Temporary testing endpoints. Any authenticated user can call these;
 * replace with Role.Admin + RolesGuard before production.
 */
@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('subscriptions/grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[dev] Grant premium subscription',
    description:
      'Dev/testing only: any JWT can grant. Body needs email. Default duration 30 days unless expiresAt/durationDays is set.',
  })
  @ApiBody({ type: GrantPremiumDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
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
    summary: '[dev] Revoke premium subscription',
    description:
      'Dev/testing only: any JWT can revoke. Body needs email. Sets plan to free and clears dates.',
  })
  @ApiBody({ type: RevokePremiumDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'User not found' })
  revokePremium(
    @Body(new JoiValidationPipe(revokePremiumSchema)) dto: RevokePremiumDto,
  ): Promise<MeResponseDto> {
    return this.adminService.revokePremium(dto);
  }
}
