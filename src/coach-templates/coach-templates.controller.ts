import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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

  @Post('apply')
  @Roles(Role.Coach)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply templates to athletes',
    description:
      'Copies each template onto each athlete plan (cartesian). Session id matches template id; already-present pairs are skipped. One DB write per athlete. Returns enriched sessions for local sync.',
  })
  @ApiBody({ type: ApplyCoachTemplateDto })
  @ApiOkResponse({ type: ApplyCoachTemplateResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  applyCoachTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(applyCoachTemplateSchema))
    dto: ApplyCoachTemplateDto,
  ): Promise<ApplyCoachTemplateResponseDto> {
    return this.coachTemplatesService.applyCoachTemplates(user.userId, dto);
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
