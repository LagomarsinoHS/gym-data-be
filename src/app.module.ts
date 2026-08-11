import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CoachTemplatesModule } from './coach-templates/coach-templates.module';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ExercisesModule } from './exercises/exercises.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    DatabaseModule,
    ExercisesModule,
    UsersModule,
    CoachTemplatesModule,
    AuthModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
