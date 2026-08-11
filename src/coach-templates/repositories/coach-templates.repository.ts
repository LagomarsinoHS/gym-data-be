import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CoachTrainingProgram,
  User,
  UserDocument,
} from '../../users/schemas/user.schema';

const NOT_DELETED = { deletedAt: null };

type UpdateUserPayload = {
  coachTemplates?: CoachTrainingProgram[];
  coachTrainingProgram?: CoachTrainingProgram[];
};

@Injectable()
export class CoachTemplatesRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ id: userId, ...NOT_DELETED }).exec();
  }

  async updateUser(userId: string, payload: UpdateUserPayload): Promise<void> {
    await this.userModel
      .updateOne({ id: userId, ...NOT_DELETED }, { $set: payload })
      .exec();
  }
}
