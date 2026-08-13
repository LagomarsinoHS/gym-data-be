import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NutritionPlan,
  NutritionPlanSchema,
} from './schemas/nutrition-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NutritionPlan.name, schema: NutritionPlanSchema },
    ]),
  ],
})
export class NutritionPlansModule {}
