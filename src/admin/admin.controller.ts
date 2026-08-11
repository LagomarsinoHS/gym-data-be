import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Body,
  Query,
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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { PaginatedResponse } from '../common/dto/paginated-response';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { OkResponseDto } from '../users/dto/ok-response.dto';
import { Role } from '../users/types/role.enum';
import { AdminService } from './admin.service';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminSubscriptionResponseDto } from './dto/admin-subscription-response.dto';
import { AdminUserListItemDto } from './dto/admin-user-list-item.dto';
import {
  GetAdminUsersQueryDto,
  getAdminUsersQuerySchema,
} from './dto/get-admin-users-query.dto';
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

  @Get('stats')
  @ApiOperation({
    summary: 'Admin overview stats',
    description:
      'Active users only (excludes soft-deleted). Counts by role and plan, paid subscriptions expiring within 7 days, and signups in the last 7/30 days.',
  })
  @ApiOkResponse({ type: AdminStatsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  getStats(): Promise<AdminStatsResponseDto> {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({
    summary: 'List users for admin',
    description:
      'Active users only (excludes soft-deleted). Optional search (name/email), role, plan, and expiringSoon filters. Newest first.',
  })
  @ApiOkResponse({ type: PaginatedResponse })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  async listUsers(
    @Query(new JoiValidationPipe(getAdminUsersQuerySchema))
    query: GetAdminUsersQueryDto,
  ): Promise<PaginatedResponse<AdminUserListItemDto>> {
    const { data, total } = await this.adminService.listUsers(query);
    return new PaginatedResponse(data, query.page, query.limit, total);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a user',
    description:
      'Sets `deletedAt` only (same as DELETE /users/me). Does not clear coachId or related data. Cannot soft-delete your own account.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Target user id',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Requires admin role, or attempting to delete yourself',
  })
  @ApiNotFoundResponse({ description: 'User not found or already deleted' })
  softDeleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<OkResponseDto> {
    return this.adminService.softDeleteUser(user.userId, userId);
  }

  @Post('subscriptions/grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant paid subscription',
    description:
      'Requires admin role. Body needs email + plan. Athlete: premium only. Coach: growth | pro. Admin targets rejected. Default duration 30 days unless expiresAt/durationDays is set.',
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
