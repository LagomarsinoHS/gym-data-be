import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CoachTemplatesController } from './coach-templates.controller';
import { CoachTemplatesService } from './coach-templates.service';
import { CoachTemplatesRepository } from './repositories/coach-templates.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => ExercisesModule),
  ],
  controllers: [CoachTemplatesController],
  providers: [CoachTemplatesService, CoachTemplatesRepository],
  exports: [CoachTemplatesService],
})
export class CoachTemplatesModule {}
