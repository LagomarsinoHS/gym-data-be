import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
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
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user from JWT sub' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.usersService.getUserById(user.userId);
  }

  @Put(':id/training-program/remove')
  @ApiOperation({
    summary: 'Remove an exercise from a user training program',
    description:
      'Removes the matching exerciseId from trainingProgram. Idempotent if already absent. Only the owner can update.',
  })
  @ApiParam({ name: 'id', example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @ApiBody({ type: RemoveTrainingProgramDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not the owner of this user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  removeFromTrainingProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new JoiValidationPipe(removeTrainingProgramSchema))
    dto: RemoveTrainingProgramDto,
  ): Promise<MeResponseDto> {
    return this.usersService.removeFromTrainingProgram(
      user.userId,
      id,
      dto.exerciseId,
    );
  }

  @Put(':id/training-program')
  @ApiOperation({
    summary: 'Add exercises to a user training program',
    description:
      'Prepends one or more catalog exercises (by business id). Skips duplicates. Only the owner can update.',
  })
  @ApiParam({ name: 'id', example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @ApiBody({ type: AddTrainingProgramDto })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not the owner of this user' })
  @ApiNotFoundResponse({ description: 'User or exercise not found' })
  addToTrainingProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new JoiValidationPipe(addTrainingProgramSchema))
    dto: AddTrainingProgramDto,
  ): Promise<MeResponseDto> {
    return this.usersService.addToTrainingProgram(
      user.userId,
      id,
      dto.exerciseIds,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', example: 'a3f1c8e2-4b9d-4e1a-9c7f-2d8e6b1a0f45' })
  @ApiOkResponse({ type: User })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(@Param('id') id: string): Promise<Omit<User, 'password'>> {
    return this.usersService.getUserById(id);
  }
}
