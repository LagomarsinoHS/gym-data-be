import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExcelModule } from '../excel/excel.module';
import { ExercisesModule } from '../exercises/exercises.module';
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
    ExercisesModule,
    ExcelModule,
    ZipModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, InvitesRepository],
  exports: [UsersService],
})
export class UsersModule {}
