import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaidSubscriptionGuard } from '../auth/guards/paid-subscription.guard';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesRepository } from './repositories/exercises.repository';
import { ExercisesService } from './exercises.service';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Exercise.name, schema: ExerciseSchema }]),
    AiModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService, ExercisesRepository, PaidSubscriptionGuard],
  exports: [ExercisesService],
})
export class ExercisesModule {}
