import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import {
  PendingCoachInvite,
  TrainingProgramExercise,
  User,
  UserDocument,
} from './schemas/user.schema';
import { CreateUserData } from './types/create-user-data.type';
import {
  MePendingCoachInviteDto,
  MeResponseDto,
  MeTrainingProgramItemDto,
} from './dto/me-response.dto';
import { OkResponseDto } from './dto/ok-response.dto';
import { CoachInviteResponseAction } from './dto/respond-coach-invite.dto';
import { ExercisesService } from '../exercises/exercises.service';
import { Exercise } from '../exercises/schemas/exercise.schema';
import { Role } from './types/role.enum';

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

  async getEnrichedUserById(id: string): Promise<MeResponseDto> {
    const user = await this.findByIdOrFail(id);

    const {
      password,
      trainingProgram,
      coachTrainingProgram,
      pendingCoachInvite,
      ...safeUser
    } = user.toObject();

    const ids = [
      ...trainingProgram.map((item) => item.exerciseId),
      ...coachTrainingProgram.map((item) => item.exerciseId),
    ];
    const catalog = await this.exercisesService.getExercisesByIds(ids);
    const byId = new Map(catalog.map((e) => [e.id, e]));

    const coach = pendingCoachInvite
      ? await this.usersRepository.findById(pendingCoachInvite.coachId)
      : null;

    return {
      ...safeUser,
      trainingProgram: enrichTrainingProgram(trainingProgram, byId),
      coachTrainingProgram: enrichTrainingProgram(coachTrainingProgram, byId),
      pendingCoachInvite: enrichPendingCoachInvite(pendingCoachInvite, coach),
    };
  }

  async createCoachInvite(
    coachId: string,
    email: string,
  ): Promise<OkResponseDto> {
    const athlete = await this.usersRepository.findByEmail(email);

    if (!athlete || athlete.role !== Role.Athlete) {
      throw new NotFoundException('No athlete found with that email');
    }

    if (athlete.pendingCoachInvite) {
      throw new ConflictException('This athlete has a pending invitation');
    }

    await this.usersRepository.setPendingCoachInvite(athlete.id, {
      coachId,
      invitedAt: new Date(),
    });

    return { ok: true };
  }

  async respondToCoachInvite(
    userId: string,
    action: CoachInviteResponseAction,
  ): Promise<MeResponseDto> {
    const user = await this.findByIdOrFail(userId);

    if (!user.pendingCoachInvite) {
      throw new ConflictException('No pending coach invitation');
    }

    await this.usersRepository.clearPendingCoachInvite(
      userId,
      action === CoachInviteResponseAction.Accept,
      user.pendingCoachInvite.coachId,
    );

    return this.getEnrichedUserById(userId);
  }

  async addToTrainingProgram(
    userId: string,
    exerciseIds: string[],
  ): Promise<MeResponseDto> {
    const user = await this.findByIdOrFail(userId);

    const existing = new Set(
      user.trainingProgram.map((item) => item.exerciseId),
    );
    const toAdd = [...new Set(exerciseIds)].filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      return this.getEnrichedUserById(userId);
    }

    await this.usersRepository.addToTrainingProgram(
      userId,
      toAdd.map((exerciseId) => ({ exerciseId })),
    );
    return this.getEnrichedUserById(userId);
  }

  async removeFromTrainingProgram(
    userId: string,
    exerciseId: string,
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.removeFromTrainingProgram(userId, exerciseId);
    return this.getEnrichedUserById(userId);
  }

  async updateTrainingProgramExercise(
    userId: string,
    exerciseId: string,
    patch: { sets?: number; reps?: string; rest?: number; notes?: string },
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);

    const updated = await this.usersRepository.updateTrainingProgramExercise(
      userId,
      exerciseId,
      patch,
    );
    if (!updated) {
      throw new NotFoundException(
        `Exercise ${exerciseId} not found in training program`,
      );
    }

    return this.getEnrichedUserById(userId);
  }

  create(data: CreateUserData): Promise<Omit<User, 'password'>> {
    return this.usersRepository.create(data);
  }
}

function enrichTrainingProgram(
  items: TrainingProgramExercise[],
  byId: Map<string, Exercise>,
): MeTrainingProgramItemDto[] {
  return items.flatMap((item) => {
    const found = byId.get(item.exerciseId);
    if (!found) return [];

    return [
      {
        exerciseId: item.exerciseId,
        order: item.order,
        sets: item.sets,
        reps: item.reps,
        rest: item.rest,
        notes: item.notes,
        exercise: {
          id: found.id,
          name: found.name,
          image: found.image,
          gif_url: found.gif_url,
          category: found.category,
          equipment: found.equipment,
        },
      },
    ];
  });
}

function enrichPendingCoachInvite(
  invite: PendingCoachInvite | null | undefined,
  coach: Pick<User, 'firstName' | 'lastName'> | null,
): MePendingCoachInviteDto | null {
  if (!invite || !coach) return null;

  return {
    coachId: invite.coachId,
    invitedAt: invite.invitedAt,
    coach: {
      firstName: coach.firstName,
      lastName: coach.lastName,
    },
  };
}
