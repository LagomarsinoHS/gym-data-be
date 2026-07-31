import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { ExerciseLabelsResponseDto } from './dto/exercise-labels-response.dto';
import {
  GetExercisesQueryDto,
  getExercisesQuerySchema,
} from './dto/get-exercises-query.dto';
import { PaginatedExercisesResponse } from './dto/paginated-exercises-response.dto';
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

  @Get()
  @ApiOperation({ summary: 'List exercises with pagination and filters' })
  @ApiOkResponse({ type: PaginatedExercisesResponse })
  async getExercises(
    @Query(new JoiValidationPipe(getExercisesQuerySchema))
    query: GetExercisesQueryDto,
  ): Promise<PaginatedExercisesResponse> {
    const { data, total } = await this.exercisesService.getExercises(query);

    return new PaginatedExercisesResponse(data, query.page, query.limit, total);
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
  @ApiOperation({
    summary: 'Recommend a mini workout for a zone and available equipment',
    description:
      'Uses zone presets (category + slot targets) to return distinct exercises with roles.',
  })
  @ApiOkResponse({ type: RecommendExercisesResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid zone or equipment' })
  recommend(
    @Query(new JoiValidationPipe(recommendExercisesQuerySchema))
    query: RecommendExercisesQueryDto,
  ): Promise<RecommendExercisesResponseDto> {
    console.log(query);
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
