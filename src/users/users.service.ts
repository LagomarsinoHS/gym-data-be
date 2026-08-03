import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UsersRepository } from './repositories/users.repository';
import { InvitesRepository } from './repositories/invites.repository';
import {
  CoachTrainingProgram,
  TrainingProgramExercise,
  User,
  UserDocument,
} from './schemas/user.schema';
import type { Invite } from './schemas/invite.schema';
import { CreateUserData } from './types/create-user-data.type';
import {
  MeCoachTrainingProgramDto,
  MePendingCoachInviteDto,
  MeResponseDto,
  MeTrainingProgramItemDto,
  PendingCoachInviteResponseDto,
} from './dto/me-response.dto';
import { CoachInviteListItemDto } from './dto/coach-invite-list-item.dto';
import { OkResponseDto } from './dto/ok-response.dto';
import { CoachInviteResponseAction } from './dto/respond-coach-invite.dto';
import { ExportCoachTrainingProgramDto } from './dto/export-coach-training-program.dto';
import { SetCoachTrainingProgramDto } from './dto/set-coach-training-program.dto';
import {
  DEFAULT_EXCEL_LOCALE,
  EXCEL_TRAINING_PROGRAM_HEADERS,
  type ExcelLocale,
} from '../excel/constants/excel-training-program-headers';
import { ExcelService } from '../excel/excel.service';
import type { AthleteTrainingProgramExport } from '../excel/types/athlete-training-program-export.type';
import { ExercisesService } from '../exercises/exercises.service';
import { Exercise } from '../exercises/schemas/exercise.schema';
import { ZipService } from '../zip/zip.service';
import { InviteStatus } from './types/invite-status.enum';
import { Role } from './types/role.enum';
import { SubscriptionPlan } from './types/subscription-plan.enum';

export type CoachTrainingProgramExportFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly invitesRepository: InvitesRepository,
    private readonly exercisesService: ExercisesService,
    private readonly excelService: ExcelService,
    private readonly zipService: ZipService,
  ) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  async getCoachAthletes(
    coachId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: MeResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;
    const [athletes, total] = await Promise.all([
      this.usersRepository.findAthletesByCoachId(coachId, skip, limit, search),
      this.usersRepository.countAthletesByCoachId(coachId, search),
    ]);

    const data = await Promise.all(
      athletes.map((athlete) => this.getEnrichedUserById(athlete.id)),
    );

    return { data, total };
  }

  async getCoachInvites(
    coachId: string,
    page: number,
    limit: number,
    status?: InviteStatus,
  ): Promise<{ data: CoachInviteListItemDto[]; total: number }> {
    const skip = (page - 1) * limit;
    const { invites, total } = await this.invitesRepository.findByCoachId(
      coachId,
      skip,
      limit,
      status,
    );

    const athletes = await this.usersRepository.findByIds(
      invites.map((invite) => invite.athleteId),
    );
    const athleteById = new Map(athletes.map((a) => [a.id, a]));

    const data = invites.map((invite) => {
      const athlete = athleteById.get(invite.athleteId);
      return {
        id: invite.id,
        athleteId: invite.athleteId,
        email: invite.email,
        status: invite.status,
        invitedAt: invite.invitedAt,
        respondedAt: invite.respondedAt ?? null,
        athlete: athlete
          ? {
              firstName: athlete.firstName,
              lastName: athlete.lastName,
            }
          : null,
      };
    });

    return { data, total };
  }

  async getEnrichedUserById(id: string): Promise<MeResponseDto> {
    const user = await this.syncSubscriptionIfExpired(
      await this.findByIdOrFail(id),
    );

    const {
      password: _password,
      trainingProgram,
      coachTrainingProgram,
      ...safeUser
    } = user.toObject() as User & { password: string };

    const ids = [
      ...trainingProgram.map((item) => item.exerciseId),
      ...coachTrainingProgram.flatMap((session) =>
        session.items.map((item) => item.exerciseId),
      ),
    ];
    const catalog = await this.exercisesService.getExercisesByIds(ids);
    const byId = new Map(catalog.map((e) => [e.id, e]));

    return {
      ...safeUser,
      trainingProgram: this.enrichTrainingProgram(trainingProgram, byId),
      coachTrainingProgram: this.enrichCoachTrainingProgram(
        coachTrainingProgram,
        byId,
      ),
    };
  }

  /**
   * Pending coach invite for an athlete (from invites collection).
   * Always { invite }; coaches / no pending → { invite: null }.
   */
  async getPendingCoachInvite(
    userId: string,
  ): Promise<PendingCoachInviteResponseDto> {
    const user = await this.findByIdOrFail(userId);
    if (user.role !== Role.Athlete) return { invite: null };

    const pendingInvite =
      await this.invitesRepository.findPendingByAthleteId(userId);

    if (!pendingInvite) return { invite: null };

    const coach = await this.usersRepository.findById(pendingInvite.coachId);
    return {
      invite: this.enrichPendingCoachInvite(pendingInvite, coach),
    };
  }

  async createCoachInvite(
    coachId: string,
    email: string,
  ): Promise<OkResponseDto> {
    const athlete = await this.usersRepository.findByEmail(email);

    if (!athlete || athlete.role !== Role.Athlete) {
      throw new NotFoundException('No athlete found with that email');
    }

    const existingInvite = await this.invitesRepository.findPendingByAthleteId(
      athlete.id,
    );

    if (existingInvite) {
      throw new ConflictException('This athlete has a pending invitation');
    }

    await this.invitesRepository.create({
      id: randomUUID(),
      coachId,
      athleteId: athlete.id,
      email: athlete.email,
      invitedAt: new Date(),
    });

    return { ok: true };
  }

  async setCoachTrainingProgram(
    coachId: string,
    athleteId: string,
    dto: SetCoachTrainingProgramDto,
  ): Promise<MeResponseDto> {
    const athlete = await this.findByIdOrFail(athleteId);

    if (athlete.role !== Role.Athlete) {
      throw new NotFoundException('Athlete not found');
    }

    if (athlete.coachId !== coachId) {
      throw new ForbiddenException(
        'You can only edit athletes assigned to you',
      );
    }

    await this.usersRepository.setCoachTrainingProgram(
      athleteId,
      dto.coachTrainingProgram,
    );

    return this.getEnrichedUserById(athleteId);
  }

  async exportCoachTrainingPrograms(
    coachId: string,
    dto: ExportCoachTrainingProgramDto,
  ): Promise<CoachTrainingProgramExportFile> {
    const locale = dto.locale ?? DEFAULT_EXCEL_LOCALE;
    const athleteIds = [...new Set(dto.athleteIds)];
    const athletes = await this.usersRepository.findAthletesByCoachIdForExport(
      coachId,
      athleteIds,
    );

    if (athletes.length === 0) {
      throw new NotFoundException('No athletes found to export');
    }

    const exerciseIds = new Set<string>();

    for (const athlete of athletes) {
      for (const program of athlete.coachTrainingProgram) {
        for (const item of program.items) {
          exerciseIds.add(item.exerciseId);
        }
      }
    }

    const catalog = await this.exercisesService.getExercisesByIds([
      ...exerciseIds,
    ]);
    const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));

    const files: { filename: string; buffer: Buffer }[] = [];

    for (const athlete of athletes) {
      const exportData = this.toAthleteTrainingProgramExport(
        athlete,
        byId,
        locale,
      );
      const buffer =
        await this.excelService.buildAthleteTrainingProgramWorkbook(
          exportData,
          locale,
        );
      if (!buffer) {
        continue;
      }

      files.push({
        filename: this.toExportFilename(athlete.firstName, athlete.lastName),
        buffer,
      });
    }

    if (files.length === 0) {
      throw new NotFoundException('No training programs to export');
    }

    return files.length === 1
      ? {
          buffer: files[0].buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: files[0].filename,
        }
      : {
          buffer: await this.zipService.buildZip(files),
          contentType: 'application/zip',
          filename: `${EXCEL_TRAINING_PROGRAM_HEADERS[locale].fileName}.zip`,
        };
  }

  async respondToCoachInvite(
    userId: string,
    action: CoachInviteResponseAction,
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);

    const pendingInvite =
      await this.invitesRepository.findPendingByAthleteId(userId);

    if (!pendingInvite) {
      throw new ConflictException('No pending coach invitation');
    }

    const accept = action === CoachInviteResponseAction.Accept;
    const status = accept ? InviteStatus.Accepted : InviteStatus.Rejected;

    await this.invitesRepository.updatePendingByAthleteId(userId, status);
    await this.usersRepository.applyCoachInviteResponse(
      userId,
      accept,
      pendingInvite.coachId,
    );

    return this.getEnrichedUserById(userId);
  }

  async addToTrainingProgram(
    userId: string,
    exerciseIds: string[],
  ): Promise<MeResponseDto> {
    const user = await this.findByIdOrFail(userId);

    const existing = new Set(
      user.trainingProgram.map((item) => item.exerciseId),
    );
    const toAdd = [...new Set(exerciseIds)].filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      return this.getEnrichedUserById(userId);
    }

    await this.usersRepository.addToTrainingProgram(
      userId,
      toAdd.map((exerciseId) => ({ exerciseId })),
    );
    return this.getEnrichedUserById(userId);
  }

  async removeFromTrainingProgram(
    userId: string,
    exerciseId: string,
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.removeFromTrainingProgram(userId, exerciseId);
    return this.getEnrichedUserById(userId);
  }

  async updateTrainingProgramExercise(
    userId: string,
    exerciseId: string,
    patch: { sets?: number; reps?: string; rest?: number; notes?: string },
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);

    const updated = await this.usersRepository.updateTrainingProgramExercise(
      userId,
      exerciseId,
      patch,
    );
    if (!updated) {
      throw new NotFoundException(
        `Exercise ${exerciseId} not found in training program`,
      );
    }

    return this.getEnrichedUserById(userId);
  }

  create(data: CreateUserData): Promise<Omit<User, 'password'>> {
    return this.usersRepository.create(data);
  }

  async grantPremium(userId: string, expiresAt: Date): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.setPremiumSubscription(
      userId,
      new Date(),
      expiresAt,
    );
    return this.getEnrichedUserById(userId);
  }

  async revokePremium(userId: string): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.clearSubscriptionToFree(userId);
    return this.getEnrichedUserById(userId);
  }

  async findByIdOrEmail(params: {
    userId?: string;
    email?: string;
  }): Promise<UserDocument> {
    if (params.userId) {
      return this.findByIdOrFail(params.userId);
    }

    if (params.email) {
      const user = await this.usersRepository.findByEmail(params.email);
      if (!user) {
        throw new NotFoundException(
          `User with email ${params.email} not found`,
        );
      }
      return user;
    }

    throw new NotFoundException('User not found');
  }

  private async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  private enrichTrainingProgram(
    items: TrainingProgramExercise[],
    byId: Map<string, Exercise>,
  ): MeTrainingProgramItemDto[] {
    return items.flatMap((item) => {
      const found = byId.get(item.exerciseId);
      if (!found) return [];

      return [
        {
          exerciseId: item.exerciseId,
          order: item.order,
          sets: item.sets,
          reps: item.reps,
          rest: item.rest,
          notes: item.notes,
          exercise: {
            id: found.id,
            name: found.name,
            image: found.image,
            gif_url: found.gif_url,
            category: found.category,
            equipment: found.equipment,
          },
        },
      ];
    });
  }

  private enrichCoachTrainingProgram(
    coachTrainingProgram: CoachTrainingProgram[],
    byId: Map<string, Exercise>,
  ): MeCoachTrainingProgramDto[] {
    return coachTrainingProgram.map((program) => ({
      id: program.id,
      name: program.name,
      order: program.order,
      items: this.enrichTrainingProgram(program.items ?? [], byId),
    }));
  }

  private enrichPendingCoachInvite(
    invite: Pick<Invite, 'coachId' | 'invitedAt'> | null | undefined,
    coach: Pick<User, 'firstName' | 'lastName'> | null,
  ): MePendingCoachInviteDto | null {
    if (!invite || !coach) return null;

    return {
      coachId: invite.coachId,
      invitedAt: invite.invitedAt,
      coach: {
        firstName: coach.firstName,
        lastName: coach.lastName,
      },
    };
  }

  /**
   * If premium period already ended, persist free subscription so /me stays current.
   */
  private async syncSubscriptionIfExpired(
    user: UserDocument,
  ): Promise<UserDocument> {
    const { subscription } = user;
    if (subscription.plan !== SubscriptionPlan.Premium) {
      return user;
    }

    const { expiresAt } = subscription;
    // If premium period is still active, return the user as is.
    if (expiresAt != null && expiresAt.getTime() > Date.now()) {
      return user;
    }

    // If premium period already ended, persist free subscription so /me stays current.
    await this.usersRepository.clearSubscriptionToFree(user.id);
    user.subscription = {
      plan: SubscriptionPlan.Free,
      startedAt: null,
      expiresAt: null,
    };
    return user;
  }

  private toAthleteTrainingProgramExport(
    athlete: Pick<User, 'firstName' | 'lastName' | 'coachTrainingProgram'>,
    byId: Map<string, Exercise>,
    locale: ExcelLocale,
  ): AthleteTrainingProgramExport {
    return {
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      coachTrainingProgram: athlete.coachTrainingProgram.map((program) => ({
        id: program.id,
        name: program.name,
        order: program.order,
        items: (program.items ?? []).map((item) => {
          const found = byId.get(item.exerciseId);
          return {
            exerciseId: item.exerciseId,
            order: item.order,
            sets: item.sets,
            reps: item.reps,
            rest: item.rest,
            notes: item.notes,
            exerciseName: found
              ? (found.name[locale] ?? found.name.es ?? found.name.en)
              : item.exerciseId,
          };
        }),
      })),
    };
  }

  private toExportFilename(firstName: string, lastName: string): string {
    const base = `${firstName}-${lastName}`
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `${base}.xlsx`;
  }
}
