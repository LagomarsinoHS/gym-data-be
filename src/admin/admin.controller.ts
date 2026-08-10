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
import { Role } from '../users/types/role.enum';
import { AdminService } from './admin.service';
import { AdminSubscriptionResponseDto } from './dto/admin-subscription-response.dto';
import {
  GrantSubscriptionDto,
  grantSubscriptionSchema,
} from './dto/grant-subscription.dto';
import {
  RevokeSubscriptionDto,
  revokeSubscriptionSchema,
} from './dto/revoke-subscription.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @ApiBody({ type: GrantSubscriptionDto })
  @ApiOkResponse({ type: AdminSubscriptionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'User not found' })
  grantSubscription(
    @Body(new JoiValidationPipe(grantSubscriptionSchema))
    dto: GrantSubscriptionDto,
  ): Promise<AdminSubscriptionResponseDto> {
    return this.adminService.grantSubscription(dto);
  }

  @Post('subscriptions/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke paid subscription',
    description:
      'Requires admin role. Body needs email. Sets plan to free and clears dates.',
  })
  @ApiBody({ type: RevokeSubscriptionDto })
  @ApiOkResponse({ type: AdminSubscriptionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'User not found' })
  revokeSubscription(
    @Body(new JoiValidationPipe(revokeSubscriptionSchema))
    dto: RevokeSubscriptionDto,
  ): Promise<AdminSubscriptionResponseDto> {
    return this.adminService.revokeSubscription(dto);
  }
}
