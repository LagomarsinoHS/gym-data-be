import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaidSubscriptionGuard } from '../auth/guards/paid-subscription.guard';
import { ExcelModule } from '../excel/excel.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { HashingModule } from '../common/hashing/hashing.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { ZipModule } from '../zip/zip.module';
import { InvitesRepository } from './repositories/invites.repository';
import { UsersRepository } from './repositories/users.repository';
import { Invite, InviteSchema } from './schemas/invite.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invite.name, schema: InviteSchema },
    ]),
    forwardRef(() => ExercisesModule),
    ExcelModule,
    ZipModule,
    StorageModule,
    HashingModule,
    AiModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, InvitesRepository, PaidSubscriptionGuard],
  exports: [UsersService],
})
export class UsersModule {}
