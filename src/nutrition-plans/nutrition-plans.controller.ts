import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { Role } from '../users/types/role.enum';
import {
  CreateNutritionPlanDto,
  createNutritionPlanSchema,
  ListNutritionPlansQueryDto,
  listNutritionPlansQuerySchema,
  NutritionPlanDto,
  NutritionPlansResponseDto,
  UpdateNutritionPlanDto,
  updateNutritionPlanSchema,
} from './dto/nutrition-plan.dto';
import { NutritionPlansService } from './nutrition-plans.service';

@ApiTags('nutrition-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nutrition-plans')
export class NutritionPlansController {
  constructor(private readonly nutritionPlansService: NutritionPlansService) {}

  @Post()
  @Roles(Role.Coach)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a nutrition plan for an assigned athlete',
    description:
      'Coach only. Snapshots athlete and coach names. New plans start as active.',
  })
  @ApiBody({ type: CreateNutritionPlanDto })
  @ApiCreatedResponse({ type: NutritionPlanDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role or not assigned' })
  @ApiNotFoundResponse({ description: 'Athlete not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(createNutritionPlanSchema))
    dto: CreateNutritionPlanDto,
  ): Promise<NutritionPlanDto> {
    return this.nutritionPlansService.create(user.userId, dto);
  }

  @Get()
  @Roles(Role.Coach, Role.Athlete)
  @ApiOperation({
    summary: 'List nutrition plans',
    description:
      'Athlete: own plans. Coach: plans they created for `athleteId` (required; must still be assigned). Optional `status` filter.',
  })
  @ApiOkResponse({ type: NutritionPlansResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires athlete or coach role' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new JoiValidationPipe(listNutritionPlansQuerySchema))
    query: ListNutritionPlansQueryDto,
  ): Promise<NutritionPlansResponseDto> {
    const data = await this.nutritionPlansService.list(
      user.userId,
      user.role,
      query,
    );
    return { data };
  }

  @Get(':planId')
  @Roles(Role.Coach, Role.Athlete)
  @ApiOperation({
    summary: 'Get a nutrition plan by id',
    description:
      'Athlete: own plan. Coach: plan they created, and still assigned to that athlete.',
  })
  @ApiOkResponse({ type: NutritionPlanDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires athlete or coach role' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
  ): Promise<NutritionPlanDto> {
    return this.nutritionPlansService.getById(user.userId, user.role, planId);
  }

  @Put(':planId')
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'Update a nutrition plan',
    description:
      'Coach only. Must still be assigned and be the creating coach. Archived plans cannot be edited.',
  })
  @ApiBody({ type: UpdateNutritionPlanDto })
  @ApiOkResponse({ type: NutritionPlanDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role or not assigned' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body(new JoiValidationPipe(updateNutritionPlanSchema))
    dto: UpdateNutritionPlanDto,
  ): Promise<NutritionPlanDto> {
    return this.nutritionPlansService.update(user.userId, planId, dto);
  }

  @Patch(':planId/archive')
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'Archive a nutrition plan',
    description:
      'Coach only. Must still be assigned and be the creating coach. Idempotent if already archived.',
  })
  @ApiOkResponse({ type: NutritionPlanDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role or not assigned' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
  ): Promise<NutritionPlanDto> {
    return this.nutritionPlansService.archive(user.userId, planId);
  }

  @Delete(':planId')
  @Roles(Role.Athlete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete an archived nutrition plan',
    description:
      'Athlete only. Own archived plan. Sets `deletedAt`; list/get omit it afterwards.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires athlete role' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
  ): Promise<void> {
    return this.nutritionPlansService.softDelete(user.userId, planId);
  }
}
