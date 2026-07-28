import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponse } from '../../common/dto/paginated-response';
import { Exercise } from '../schemas/exercise.schema';

export class PaginatedExercisesResponse extends PaginatedResponse<Exercise> {
  @ApiProperty({ type: [Exercise] })
  declare data: Exercise[];
}
