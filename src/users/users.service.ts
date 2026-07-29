import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserData } from './types/create-user-data.type';
import { MeResponseDto } from './dto/me-response.dto';
import { ExercisesService } from '../exercises/exercises.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly exercisesService: ExercisesService,
  ) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  private async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getUserById(id: string): Promise<MeResponseDto> {
    const user = await this.findByIdOrFail(id);

    const { password, trainingProgram, ...safeUser } = user.toObject();
    const ids = trainingProgram.map((item) => item.exerciseId);
    const catalog = await this.exercisesService.getExercisesByIds(ids);
    const byId = new Map(catalog.map((e) => [e.id, e]));

    const program = trainingProgram.map((item) => {
      const found = byId.get(item.exerciseId);
      return {
        exerciseId: item.exerciseId,
        order: item.order,
        sets: item.sets,
        reps: item.reps,
        rest: item.rest,
        notes: item.notes,
        exercise: found
          ? {
              id: found.id,
              name: found.name,
              image: found.image,
              gif_url: found.gif_url,
              category: found.category,
              equipment: found.equipment,
            }
          : null,
      };
    });

    return { ...safeUser, trainingProgram: program };
  }

  async addToTrainingProgram(
    jwtUserId: string,
    userId: string,
    exerciseIds: string[],
  ): Promise<MeResponseDto> {
    if (jwtUserId !== userId) {
      throw new ForbiddenException(
        'You can only update your own training program',
      );
    }

    const user = await this.findByIdOrFail(userId);

    const uniqueIds = [...new Set(exerciseIds)];
    const catalog = await this.exercisesService.getExercisesByIds(uniqueIds);
    const foundIds = new Set(catalog.map((e) => e.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Exercises not found: ${missing.join(', ')}`);
    }

    const existing = new Set(
      user.trainingProgram.map((item) => item.exerciseId),
    );
    const toAdd = uniqueIds.filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      return this.getUserById(userId);
    }

    const items = toAdd.map((exerciseId) => ({ exerciseId }));
    await this.usersRepository.addToTrainingProgram(userId, items);
    return this.getUserById(userId);
  }

  async removeFromTrainingProgram(
    jwtUserId: string,
    userId: string,
    exerciseId: string,
  ): Promise<MeResponseDto> {
    if (jwtUserId !== userId) {
      throw new ForbiddenException(
        'You can only update your own training program',
      );
    }

    await this.findByIdOrFail(userId);
    await this.usersRepository.removeFromTrainingProgram(userId, exerciseId);
    return this.getUserById(userId);
  }

  create(data: CreateUserData): Promise<Omit<User, 'password'>> {
    return this.usersRepository.create(data);
  }
}
