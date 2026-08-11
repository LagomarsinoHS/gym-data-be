import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CoachTrainingProgram,
  ProgressPhoto,
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
import { recomputeCurrentWeightKg } from '../utils/progress-photo-weight';

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
  $or?: Array<
    | { 'profile.firstName': RegExp }
    | { 'profile.lastName': RegExp }
    | { email: RegExp }
  >;
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
        profile: 1,
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
    const currentWeightKg = recomputeCurrentWeightKg(progressPhotos);
    await this.userModel
      .updateOne(
        { id: userId, ...NOT_DELETED },
        { $set: { progressPhotos, currentWeightKg } },
      )
      .exec();
  }

  async setProfilePhoto(
    userId: string,
    profilePhoto: ProgressPhoto,
  ): Promise<void> {
    await this.userModel
      .updateOne({ id: userId, ...NOT_DELETED }, { $set: { profilePhoto } })
      .exec();
  }

  async updateProfileFields(
    userId: string,
    patch: {
      password?: string;
      goal?: string | null;
      profile?: {
        firstName?: string;
        lastName?: string;
        heightCm?: number | null;
        sex?: string | null;
        birthDate?: string | null;
      };
    },
  ): Promise<void> {
    const $set: Record<string, unknown> = {};
    if (patch.password !== undefined) {
      $set.password = patch.password;
    }
    if (patch.goal !== undefined) {
      $set.goal = patch.goal;
    }
    if (patch.profile) {
      for (const [key, value] of Object.entries(patch.profile)) {
        if (value !== undefined) {
          $set[`profile.${key}`] = value;
        }
      }
    }
    if (Object.keys($set).length === 0) return;
    await this.userModel
      .updateOne({ id: userId, ...NOT_DELETED }, { $set })
      .exec();
  }

  async softDeleteById(userId: string): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        { id: userId, ...NOT_DELETED },
        { $set: { deletedAt: new Date() } },
      )
      .exec();

    return result.matchedCount > 0;
  }

  /**
   * Active-user aggregates for admin Overview.
   * Soft-deleted users are excluded.
   */
  async getAdminStats(): Promise<{
    users: {
      total: number;
      byRole: { athlete: number; coach: number; admin: number };
    };
    subscriptions: {
      byPlan: {
        free: number;
        premium: number;
        growth: number;
        pro: number;
      };
      paidExpiringSoon: number;
    };
    signups: { last7Days: number; last30Days: number };
  }> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      roleRows,
      planRows,
      paidExpiringSoon,
      signups7,
      signups30,
    ] = await Promise.all([
      this.userModel.countDocuments(NOT_DELETED).exec(),
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          { $match: NOT_DELETED },
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ])
        .exec(),
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          { $match: NOT_DELETED },
          { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
        ])
        .exec(),
      this.userModel
        .countDocuments({
          ...NOT_DELETED,
          'subscription.plan': { $ne: SubscriptionPlan.Free },
          'subscription.expiresAt': { $gte: now, $lte: in7Days },
        })
        .exec(),
      this.userModel
        .countDocuments({ ...NOT_DELETED, createdAt: { $gte: since7 } })
        .exec(),
      this.userModel
        .countDocuments({ ...NOT_DELETED, createdAt: { $gte: since30 } })
        .exec(),
    ]);

    const byRole = { athlete: 0, coach: 0, admin: 0 };
    for (const row of roleRows) {
      if (row._id === Role.Athlete) byRole.athlete = row.count;
      else if (row._id === Role.Coach) byRole.coach = row.count;
      else if (row._id === Role.Admin) byRole.admin = row.count;
    }

    const byPlan = { free: 0, premium: 0, growth: 0, pro: 0 };
    for (const row of planRows) {
      if (row._id === SubscriptionPlan.Free) byPlan.free = row.count;
      else if (row._id === SubscriptionPlan.Premium) byPlan.premium = row.count;
      else if (row._id === SubscriptionPlan.Growth) byPlan.growth = row.count;
      else if (row._id === SubscriptionPlan.Pro) byPlan.pro = row.count;
    }

    return {
      users: { total, byRole },
      subscriptions: { byPlan, paidExpiringSoon },
      signups: { last7Days: signups7, last30Days: signups30 },
    };
  }

  async findAdminUsers(
    skip: number,
    limit: number,
    filters: {
      search?: string;
      role?: Role;
      plan?: SubscriptionPlan;
      expiringSoon?: boolean;
    },
  ): Promise<UserDocument[]> {
    return this.userModel
      .find(this.buildAdminUsersFilter(filters))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAdminUsers(filters: {
    search?: string;
    role?: Role;
    plan?: SubscriptionPlan;
    expiringSoon?: boolean;
  }): Promise<number> {
    return this.userModel
      .countDocuments(this.buildAdminUsersFilter(filters))
      .exec();
  }

  private buildAdminUsersFilter(filters: {
    search?: string;
    role?: Role;
    plan?: SubscriptionPlan;
    expiringSoon?: boolean;
  }): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...NOT_DELETED };

    if (filters.role) filter.role = filters.role;
    if (filters.plan) filter['subscription.plan'] = filters.plan;

    if (filters.expiringSoon) {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filter['subscription.plan'] = { $ne: SubscriptionPlan.Free };
      filter['subscription.expiresAt'] = { $gte: now, $lte: in7Days };
      // Explicit plan filter overrides "not free" when both are set.
      if (filters.plan) {
        if (filters.plan === SubscriptionPlan.Free) {
          // Impossible combo: no free user is "paid expiring".
          filter.id = '__none__';
        } else {
          filter['subscription.plan'] = filters.plan;
        }
      }
    }

    const search = filters.search?.trim();
    if (search) {
      const rx = new RegExp(this.escapeRegex(search), 'i');
      filter.$or = [
        { 'profile.firstName': rx },
        { 'profile.lastName': rx },
        { email: rx },
      ];
    }

    return filter;
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
      filter.$or = [
        { 'profile.firstName': rx },
        { 'profile.lastName': rx },
        { email: rx },
      ];
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
