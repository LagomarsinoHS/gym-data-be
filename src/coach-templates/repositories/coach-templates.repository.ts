import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CoachTrainingProgram,
  User,
  UserDocument,
} from '../../users/schemas/user.schema';

const NOT_DELETED = { deletedAt: null };

@Injectable()
export class CoachTemplatesRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findCoachById(coachId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ id: coachId, ...NOT_DELETED }).exec();
  }

  async findUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ id: userId, ...NOT_DELETED }).exec();
  }

  async setCoachTemplates(
    coachId: string,
    coachTemplates: CoachTrainingProgram[],
  ): Promise<void> {
    await this.userModel
      .updateOne({ id: coachId, ...NOT_DELETED }, { $set: { coachTemplates } })
      .exec();
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
}
