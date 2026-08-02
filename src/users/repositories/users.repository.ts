import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CoachTrainingSession,
  PendingCoachInvite,
  TrainingProgramExercise,
  User,
  UserDocument,
} from '../schemas/user.schema';
import { CreateUserData } from '../types/create-user-data.type';
import { Role } from '../types/role.enum';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type AthletesByCoachFilter = {
  role: Role;
  coachId: string;
  deletedAt: null;
  $or?: Array<{ firstName: RegExp } | { lastName: RegExp } | { email: RegExp }>;
};

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ id, deletedAt: null }).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, deletedAt: null }).exec();
  }

  findAthletesByCoachId(
    coachId: string,
    skip: number,
    limit: number,
    search?: string,
  ): Promise<UserDocument[]> {
    return this.userModel
      .find(this.buildAthletesByCoachFilter(coachId, search))
      .skip(skip)
      .limit(limit)
      .exec();
  }

  countAthletesByCoachId(coachId: string, search?: string): Promise<number> {
    return this.userModel
      .countDocuments(this.buildAthletesByCoachFilter(coachId, search))
      .exec();
  }

  findAthletesByCoachIdForExport(
    coachId: string,
    athleteIds?: string[],
  ): Promise<UserDocument[]> {
    const filter: AthletesByCoachFilter & { id?: { $in: string[] } } = {
      ...this.buildAthletesByCoachFilter(coachId),
    };

    if (athleteIds?.length) {
      filter.id = { $in: athleteIds };
    }

    return this.userModel
      .find(filter)
      .select({
        id: 1,
        firstName: 1,
        lastName: 1,
        coachTrainingProgram: 1,
        _id: 0,
      })
      .exec();
  }

  private buildAthletesByCoachFilter(
    coachId: string,
    search?: string,
  ): AthletesByCoachFilter {
    const filter: AthletesByCoachFilter = {
      role: Role.Athlete,
      coachId,
      deletedAt: null,
    };

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
    }

    return filter;
  }

  async create(user: CreateUserData): Promise<Omit<User, 'password'>> {
    const created = await this.userModel.create(user);
    const { password: _password, ...safeUser } = created.toObject();
    return safeUser;
  }

  async setPendingCoachInvite(
    userId: string,
    invite: PendingCoachInvite,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: userId, deletedAt: null },
        { $set: { pendingCoachInvite: invite } },
      )
      .exec();
  }

  async setCoachTrainingProgram(
    athleteId: string,
    coachTrainingProgram: CoachTrainingSession[],
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: athleteId, deletedAt: null },
        { $set: { coachTrainingProgram } },
      )
      .exec();
  }

  async clearPendingCoachInvite(
    userId: string,
    accept: boolean,
    coachId: string,
  ): Promise<void> {
    const $set: { pendingCoachInvite: null; coachId?: string } = {
      pendingCoachInvite: null,
    };
    if (accept) {
      $set.coachId = coachId;
    }

    await this.userModel
      .updateOne({ id: userId, deletedAt: null }, { $set })
      .exec();
  }

  async addToTrainingProgram(
    userId: string,
    items: Pick<TrainingProgramExercise, 'exerciseId'>[],
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: userId, deletedAt: null },
        { $push: { trainingProgram: { $each: items, $position: 0 } } },
      )
      .exec();
  }

  async removeFromTrainingProgram(
    userId: string,
    exerciseId: string,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: userId, deletedAt: null },
        { $pull: { trainingProgram: { exerciseId } } },
      )
      .exec();
  }

  async updateTrainingProgramExercise(
    userId: string,
    exerciseId: string,
    patch: Partial<
      Pick<TrainingProgramExercise, 'sets' | 'reps' | 'rest' | 'notes'>
    >,
  ): Promise<boolean> {
    const $set: Record<string, string | number> = {};
    if (patch.sets !== undefined) {
      $set['trainingProgram.$.sets'] = patch.sets;
    }
    if (patch.reps !== undefined) {
      $set['trainingProgram.$.reps'] = patch.reps;
    }
    if (patch.rest !== undefined) {
      $set['trainingProgram.$.rest'] = patch.rest;
    }
    if (patch.notes !== undefined) {
      $set['trainingProgram.$.notes'] = patch.notes;
    }

    const result = await this.userModel
      .updateOne(
        {
          id: userId,
          deletedAt: null,
          'trainingProgram.exerciseId': exerciseId,
        },
        { $set },
      )
      .exec();

    return result.matchedCount > 0;
  }
}
