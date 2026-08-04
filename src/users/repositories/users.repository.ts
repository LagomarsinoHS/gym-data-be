import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CoachTrainingProgram,
  ProgressPhotoMonth,
  TrainingProgramExercise,
  User,
  UserDocument,
} from '../schemas/user.schema';
import { CreateUserData } from '../types/create-user-data.type';
import { Role } from '../types/role.enum';
import {
  GrantableSubscriptionPlan,
  SubscriptionPlan,
} from '../types/subscription-plan.enum';

/** Active users: soft-delete field must be absent (never stored as null). */
const NOT_DELETED = { deletedAt: { $exists: false } } as const;

const FREE_SUBSCRIPTION = {
  plan: SubscriptionPlan.Free,
  startedAt: null,
  expiresAt: null,
} as const;

type AthletesByCoachFilter = {
  role: Role;
  coachId: string;
  deletedAt: { $exists: false };
  $or?: Array<{ firstName: RegExp } | { lastName: RegExp } | { email: RegExp }>;
};

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ id, ...NOT_DELETED }).exec();
  }

  findByIds(ids: string[]): Promise<UserDocument[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.userModel
      .find({ id: { $in: [...new Set(ids)] }, ...NOT_DELETED })
      .exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, ...NOT_DELETED }).exec();
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

  async create(user: CreateUserData): Promise<Omit<User, 'password'>> {
    const created = await this.userModel.create(user);
    const { password: _password, ...safeUser } = created.toObject();
    return safeUser;
  }

  async setCoachTrainingProgram(
    athleteId: string,
    coachTrainingProgram: CoachTrainingProgram[],
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: athleteId, ...NOT_DELETED },
        { $set: { coachTrainingProgram } },
      )
      .exec();
  }

  /**
   * Assign coach on accept. Reject only updates the Invite row (no user change).
   */
  async applyCoachInviteResponse(
    athleteId: string,
    accept: boolean,
    coachId: string,
  ): Promise<void> {
    if (!accept) return;

    await this.userModel
      .updateOne({ id: athleteId, ...NOT_DELETED }, { $set: { coachId } })
      .exec();
  }

  async clearSubscriptionToFree(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { id: userId, ...NOT_DELETED },
        {
          $set: { subscription: { ...FREE_SUBSCRIPTION } },
        },
      )
      .exec();
  }

  async setPaidSubscription(
    userId: string,
    plan: GrantableSubscriptionPlan,
    startedAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: userId, ...NOT_DELETED },
        {
          $set: {
            subscription: {
              plan,
              startedAt,
              expiresAt,
            },
          },
        },
      )
      .exec();
  }

  async addToTrainingProgram(
    userId: string,
    items: Pick<TrainingProgramExercise, 'exerciseId'>[],
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { id: userId, ...NOT_DELETED },
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
        { id: userId, ...NOT_DELETED },
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
          ...NOT_DELETED,
          'trainingProgram.exerciseId': exerciseId,
        },
        { $set },
      )
      .exec();

    return result.matchedCount > 0;
  }

  async setProgressPhotos(
    userId: string,
    progressPhotos: ProgressPhotoMonth[],
  ): Promise<void> {
    await this.userModel
      .updateOne({ id: userId, ...NOT_DELETED }, { $set: { progressPhotos } })
      .exec();
  }

  private buildAthletesByCoachFilter(
    coachId: string,
    search?: string,
  ): AthletesByCoachFilter {
    const filter: AthletesByCoachFilter = {
      role: Role.Athlete,
      coachId,
      ...NOT_DELETED,
    };

    if (search) {
      const rx = new RegExp(this.escapeRegex(search), 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
