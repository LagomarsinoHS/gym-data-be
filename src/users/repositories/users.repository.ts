import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TrainingProgramExercise,
  User,
  UserDocument,
} from '../schemas/user.schema';
import { CreateUserData } from '../types/create-user-data.type';

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
    return this.userModel.findOne({ email }).exec();
  }

  async create(user: CreateUserData): Promise<Omit<User, 'password'>> {
    const created = await this.userModel.create(user);
    const { password: _password, ...safeUser } = created.toObject();
    return safeUser;
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
}
