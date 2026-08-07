import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaginatedResponse } from '../common/dto/paginated-response';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { ExerciseLabelsResponseDto } from './dto/exercise-labels-response.dto';
import { GetExercisesQueryDto, getExercisesQuerySchema } from './dto/get-exercises-query.dto';
import {
  RecommendExercisesQueryDto,
  RecommendExercisesResponseDto,
  recommendExercisesQuerySchema,
} from './dto/recommend-exercises.dto';
import { ExercisesService } from './exercises.service';
import { Exercise } from './schemas/exercise.schema';

@ApiTags('exercises')
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  // --- GET ---

  @Get()
  @ApiOperation({ summary: 'List exercises with pagination and filters' })
  @ApiOkResponse({ type: PaginatedResponse })
  async getExercises(
    @Query(new JoiValidationPipe(getExercisesQuerySchema))
    query: GetExercisesQueryDto,
  ): Promise<PaginatedResponse<Exercise>> {
    const { data, total } = await this.exercisesService.getExercises(query);

    return new PaginatedResponse(data, query.page, query.limit, total);
  }

  @Get('labels')
  @ApiOperation({ summary: 'List all exercise filter labels' })
  @ApiOkResponse({ type: ExerciseLabelsResponseDto })
  getExerciseLabels(): Promise<ExerciseLabelsResponseDto> {
    return this.exercisesService.getExerciseLabels();
  }

  @Get('random')
  @ApiOperation({ summary: 'Get a random exercise' })
  @ApiOkResponse({ type: Exercise })
  @ApiNotFoundResponse({ description: 'No exercises found' })
  getRandomExercise(): Promise<Exercise> {
    return this.exercisesService.getRandomExercise();
  }

  @Get('recommend')
  @ApiBearerAuth()
  //@UseGuards(JwtAuthGuard, PaidSubscriptionGuard)
  @ApiOperation({
    summary: 'AI recommend: 4 exercises + explanation note',
    description:
      'Requires JWT + paid subscription (not free). Filters catalog by zone + 1–2 equipment, AI picks 4 with sets/reps/rest + note.',
  })
  @ApiOkResponse({ type: RecommendExercisesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Free / expired subscription (PAID_SUBSCRIPTION_REQUIRED)',
  })
  @ApiBadRequestResponse({
    description: 'Invalid zone/equipment or not enough matching exercises',
  })
  recommend(
    @Query(new JoiValidationPipe(recommendExercisesQuerySchema))
    query: RecommendExercisesQueryDto,
  ): Promise<RecommendExercisesResponseDto> {
    return this.exercisesService.recommend(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exercise by business id' })
  @ApiParam({ name: 'id', example: '0001' })
  @ApiOkResponse({ type: Exercise })
  @ApiNotFoundResponse({ description: 'Exercise not found' })
  getExercise(@Param('id') id: string): Promise<Exercise> {
    return this.exercisesService.getExerciseById(id);
  }
}
