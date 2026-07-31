import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  AddTrainingProgramDto,
  addTrainingProgramSchema,
} from './dto/add-training-program.dto';
import { MeResponseDto } from './dto/me-response.dto';
import {
  RemoveTrainingProgramDto,
  removeTrainingProgramSchema,
} from './dto/remove-training-program.dto';
import {
  UpdateTrainingProgramExerciseDto,
  updateTrainingProgramExerciseSchema,
} from './dto/update-training-program-exercise.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(@Param('id') id: string): Promise<MeResponseDto> {
    return this.usersService.getEnrichedUserById(id);
  }

  // --- POST ---

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
