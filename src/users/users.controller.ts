import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
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
import {
  AddTrainingProgramDto,
  addTrainingProgramSchema,
} from './dto/add-training-program.dto';
import {
  CreateCoachInviteDto,
  createCoachInviteSchema,
} from './dto/create-coach-invite.dto';
import {
  ExportCoachTrainingProgramDto,
  exportCoachTrainingProgramSchema,
} from './dto/export-coach-training-program.dto';
import {
  GetCoachAthletesQueryDto,
  getCoachAthletesQuerySchema,
} from './dto/get-coach-athletes-query.dto';
import {
  GetCoachInvitesQueryDto,
  getCoachInvitesQuerySchema,
} from './dto/get-coach-invites-query.dto';
import { CoachInviteListItemDto } from './dto/coach-invite-list-item.dto';
import {
  MeResponseDto,
  PendingCoachInviteResponseDto,
} from './dto/me-response.dto';
import { OkResponseDto } from './dto/ok-response.dto';
import {
  RespondCoachInviteDto,
  respondCoachInviteSchema,
} from './dto/respond-coach-invite.dto';
import {
  RemoveTrainingProgramDto,
  removeTrainingProgramSchema,
} from './dto/remove-training-program.dto';
import {
  SetCoachTrainingProgramDto,
  setCoachTrainingProgramSchema,
} from './dto/set-coach-training-program.dto';
import {
  UpdateTrainingProgramExerciseDto,
  updateTrainingProgramExerciseSchema,
} from './dto/update-training-program-exercise.dto';
import { Role } from './types/role.enum';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- GET ---

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user from JWT sub' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.usersService.getEnrichedUserById(user.userId);
  }

  @Get('me/pending-coach-invite')
  @Roles(Role.Athlete)
  @ApiOperation({
    summary: 'Get the athlete pending coach invitation',
    description:
      'Reads from the invites collection. Always returns { invite }. invite is null when there is none. At most one pending invite per athlete.',
  })
  @ApiOkResponse({ type: PendingCoachInviteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires athlete role' })
  getPendingCoachInvite(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PendingCoachInviteResponseDto> {
    return this.usersService.getPendingCoachInvite(user.userId);
  }

  @Post('me/pending-coach-invite/respond')
  @Roles(Role.Athlete)
  @ApiOperation({
    summary: 'Accept or reject a pending coach invitation',
    description:
      'Looks up the pending Invite for the authenticated athlete. Accept assigns coachId (replacing any previous coach) and marks the Invite accepted. Reject marks the Invite rejected.',
  })
  @ApiBody({ type: RespondCoachInviteDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires athlete role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'No pending coach invitation' })
  respondToCoachInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(respondCoachInviteSchema))
    dto: RespondCoachInviteDto,
  ): Promise<MeResponseDto> {
    return this.usersService.respondToCoachInvite(user.userId, dto.action);
  }

  @Get('coach/athletes')
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'List athletes assigned to the authenticated coach',
    description: 'Optional search matches firstName, lastName, or email.',
  })
  @ApiOkResponse({ type: PaginatedResponse })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  async getCoachAthletes(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new JoiValidationPipe(getCoachAthletesQuerySchema))
    query: GetCoachAthletesQueryDto,
  ): Promise<PaginatedResponse<MeResponseDto>> {
    const { data, total } = await this.usersService.getCoachAthletes(
      user.userId,
      query.page,
      query.limit,
      query.search,
    );

    return new PaginatedResponse(data, query.page, query.limit, total);
  }

  @Get('coach/invites')
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'List invite history for the authenticated coach',
    description:
      'Full invite history (pending, accepted, rejected, cancelled). Optional status filter. Newest first.',
  })
  @ApiOkResponse({ type: PaginatedResponse })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  async getCoachInvites(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new JoiValidationPipe(getCoachInvitesQuerySchema))
    query: GetCoachInvitesQueryDto,
  ): Promise<PaginatedResponse<CoachInviteListItemDto>> {
    const { data, total } = await this.usersService.getCoachInvites(
      user.userId,
      query.page,
      query.limit,
      query.status,
    );

    return new PaginatedResponse(data, query.page, query.limit, total);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(@Param('id') id: string): Promise<MeResponseDto> {
    return this.usersService.getEnrichedUserById(id);
  }

  // --- POST ---

  @Post('coach/training-program/export')
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'Export coach training programs as Excel (or ZIP)',
    description:
      'athleteIds: [] exports all assigned athletes; otherwise exports the given ids. One file → .xlsx; multiple → .zip. Athletes without a coachTrainingProgram are skipped.',
  })
  @ApiBody({ type: ExportCoachTrainingProgramDto })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
  )
  @ApiOkResponse({ description: 'Excel or ZIP file download' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description:
      'Requires coach role, or one or more athletes are not assigned to this coach',
  })
  @ApiNotFoundResponse({ description: 'No athletes or programs to export' })
  async exportCoachTrainingPrograms(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(exportCoachTrainingProgramSchema))
    dto: ExportCoachTrainingProgramDto,
  ): Promise<StreamableFile> {
    const file = await this.usersService.exportCoachTrainingPrograms(
      user.userId,
      dto,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Post('coach/invites')
  @Roles(Role.Coach)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite an athlete by email',
    description:
      'Creates a pending Invite for the athlete with the authenticated coach id.',
  })
  @ApiBody({ type: CreateCoachInviteDto })
  @ApiCreatedResponse({ type: OkResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires coach role' })
  @ApiNotFoundResponse({ description: 'Athlete not found for that email' })
  @ApiConflictResponse({
    description: 'Athlete already has a pending invitation',
  })
  createCoachInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(createCoachInviteSchema))
    dto: CreateCoachInviteDto,
  ): Promise<OkResponseDto> {
    return this.usersService.createCoachInvite(user.userId, dto.email);
  }

  @Post('training-program')
  @ApiOperation({
    summary: 'Add exercises to the authenticated user training program',
    description:
      'Prepends one or more catalog exercises (by business id). Skips duplicates. User id comes from JWT.',
  })
  @ApiBody({ type: AddTrainingProgramDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'User or exercise not found' })
  addToTrainingProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(addTrainingProgramSchema))
    dto: AddTrainingProgramDto,
  ): Promise<MeResponseDto> {
    return this.usersService.addToTrainingProgram(user.userId, dto.exerciseIds);
  }

  // --- PUT ---

  @Put('coach/athletes/:athleteId/training-program')
  @Roles(Role.Coach)
  @ApiOperation({
    summary: 'Replace an athlete coach training program',
    description:
      'Sets coachTrainingProgram to the provided array for an athlete assigned to the authenticated coach. Send exerciseId only per item.',
  })
  @ApiParam({
    name: 'athleteId',
    example: 'ee923be1-1192-460e-89ee-2275d4d3f206',
  })
  @ApiBody({ type: SetCoachTrainingProgramDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Athlete not found' })
  @ApiForbiddenResponse({
    description:
      'Requires coach role, or athlete is not assigned to this coach',
  })
  setCoachTrainingProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Body(new JoiValidationPipe(setCoachTrainingProgramSchema))
    dto: SetCoachTrainingProgramDto,
  ): Promise<MeResponseDto> {
    return this.usersService.setCoachTrainingProgram(
      user.userId,
      athleteId,
      dto,
    );
  }

  @Put('training-program/remove')
  @ApiOperation({
    summary: 'Remove an exercise from the authenticated user training program',
    description:
      'Removes the matching exerciseId from trainingProgram. Idempotent if already absent. User id comes from JWT.',
  })
  @ApiBody({ type: RemoveTrainingProgramDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'User not found' })
  removeFromTrainingProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new JoiValidationPipe(removeTrainingProgramSchema))
    dto: RemoveTrainingProgramDto,
  ): Promise<MeResponseDto> {
    return this.usersService.removeFromTrainingProgram(
      user.userId,
      dto.exerciseId,
    );
  }

  @Put('training-program/:exerciseId')
  @ApiOperation({
    summary: 'Update an exercise in the authenticated user training program',
    description:
      'Updates sets, reps, rest and/or notes for one item. User id comes from JWT.',
  })
  @ApiParam({ name: 'exerciseId', example: '0001' })
  @ApiBody({ type: UpdateTrainingProgramExerciseDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({
    description: 'User or exercise not found in training program',
  })
  updateTrainingProgramExercise(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId') exerciseId: string,
    @Body(new JoiValidationPipe(updateTrainingProgramExerciseSchema))
    dto: UpdateTrainingProgramExerciseDto,
  ): Promise<MeResponseDto> {
    return this.usersService.updateTrainingProgramExercise(
      user.userId,
      exerciseId,
      dto,
    );
  }
}
