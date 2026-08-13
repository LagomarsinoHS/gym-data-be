import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NutritionPlan,
  NutritionPlanDocument,
} from '../schemas/nutrition-plan.schema';
import { NutritionPlanStatus } from '../types/nutrition-plan-status.enum';

/** Visible plans: soft-delete field must be absent (never stored as null). */
const NOT_DELETED = { deletedAt: { $exists: false } } as const;

export type NutritionPlanListFilter = {
  athleteId: string;
  coachId?: string;
  status?: NutritionPlanStatus;
};

@Injectable()
export class NutritionPlansRepository {
  constructor(
    @InjectModel(NutritionPlan.name)
    private readonly planModel: Model<NutritionPlanDocument>,
  ) {}

  async create(plan: NutritionPlan): Promise<NutritionPlanDocument> {
    const created = await this.planModel.create(plan);
    return created;
  }

  async findById(id: string): Promise<NutritionPlanDocument | null> {
    return this.planModel.findOne({ id, ...NOT_DELETED }).exec();
  }

  async findMany(
    filter: NutritionPlanListFilter,
  ): Promise<NutritionPlanDocument[]> {
    const query: Record<string, unknown> = {
      'athlete.id': filter.athleteId,
      ...NOT_DELETED,
    };
    if (filter.coachId) query['coach.id'] = filter.coachId;
    if (filter.status) query.status = filter.status;

    return this.planModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async updateById(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<NutritionPlanDocument | null> {
    return this.planModel
      .findOneAndUpdate({ id }, { $set: patch }, { new: true })
      .exec();
  }
}
