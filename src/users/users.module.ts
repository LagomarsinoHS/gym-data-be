import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ExcelModule } from '../excel/excel.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { HashingModule } from '../common/hashing/hashing.module';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { PdfModule } from '../pdf/pdf.module';
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
    forwardRef(() => AuthModule),
    forwardRef(() => ExercisesModule),
    ExcelModule,
    PdfModule,
    ZipModule,
    StorageModule,
    HashingModule,
    AiModule,
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, InvitesRepository],
  exports: [UsersService],
})
export class UsersModule {}
