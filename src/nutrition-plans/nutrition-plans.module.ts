import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { NutritionPlansController } from './nutrition-plans.controller';
import { NutritionPlansService } from './nutrition-plans.service';
import { NutritionPlansRepository } from './repositories/nutrition-plans.repository';
import {
  NutritionPlan,
  NutritionPlanSchema,
} from './schemas/nutrition-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NutritionPlan.name, schema: NutritionPlanSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [NutritionPlansController],
  providers: [NutritionPlansService, NutritionPlansRepository],
  exports: [NutritionPlansService],
})
export class NutritionPlansModule {}
