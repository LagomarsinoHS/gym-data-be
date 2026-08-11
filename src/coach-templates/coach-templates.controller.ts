import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
  ApiParam,
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
import { CoachTemplatesService } from './coach-templates.service';
import {
  ApplyCoachTemplateDto,
  ApplyCoachTemplateResponseDto,
  applyCoachTemplateSchema,
} from './dto/apply-coach-template.dto';
import {
  CreateCoachTemplateDto,
  CreateCoachTemplateResponseDto,
  createCoachTemplateSchema,
} from './dto/create-coach-template.dto';
import {
  CoachTemplatesResponseDto,
  SetCoachTemplatesDto,
  setCoachTemplatesSchema,
} from './dto/set-coach-templates.dto';

@ApiTags('coach-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coach/templates')
export class CoachTemplatesController {
  constructor(private readonly coachTemplatesService: CoachTemplatesService) {}

  @Get()
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'List reusable session templates for the authenticated coach',
    description:
      'Returns coachTemplates enriched with catalog exercise summaries. Same item shape as coachTrainingProgram sessions.',
  })
  @ApiOkResponse({ type: CoachTemplatesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  getCoachTemplates(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CoachTemplatesResponseDto> {
    return this.coachTemplatesService.getCoachTemplates(user.userId);
  }

  @Post()
  @Roles(Role.Coach)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a session template',
    description:
      'Creates a reusable template. The server assigns a stable UUID; do not send id. Items may be empty.',
  })
  @ApiBody({ type: CreateCoachTemplateDto })
  @ApiCreatedResponse({ type: CreateCoachTemplateResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  createCoachTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(createCoachTemplateSchema))
    dto: CreateCoachTemplateDto,
  ): Promise<CreateCoachTemplateResponseDto> {
    return this.coachTemplatesService.createCoachTemplate(user.userId, dto);
  }

  @Post(':id/apply')
  @Roles(Role.Coach)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply a template to one or more athletes',
    description:
      'Copies the template as a new session onto each athlete plan. Session id matches the template id; athletes that already have it are skipped. Response includes the enriched session payload for clients to sync local plan state.',
  })
  @ApiParam({ name: 'id', description: 'Template id' })
  @ApiBody({ type: ApplyCoachTemplateDto })
  @ApiOkResponse({ type: ApplyCoachTemplateResponseDto })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  applyCoachTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') templateId: string,
    @Body(new JoiValidationPipe(applyCoachTemplateSchema))
    dto: ApplyCoachTemplateDto,
  ): Promise<ApplyCoachTemplateResponseDto> {
    return this.coachTemplatesService.applyCoachTemplate(
      user.userId,
      templateId,
      dto,
    );
  }

  @Put()
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'Replace coach session templates',
    description:
      'Sets coachTemplates to the provided array for the authenticated coach. Send exerciseId only per item. Prefer POST for new templates so ids stay server-owned.',
  })
  @ApiBody({ type: SetCoachTemplatesDto })
  @ApiOkResponse({ type: CoachTemplatesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  setCoachTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(setCoachTemplatesSchema))
    dto: SetCoachTemplatesDto,
  ): Promise<CoachTemplatesResponseDto> {
    return this.coachTemplatesService.setCoachTemplates(user.userId, dto);
  }
}
