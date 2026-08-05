import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiErrorCode } from '../common/errors/api-error-code';
import {
  throwApiConflict,
  throwApiForbidden,
  throwApiNotFound,
} from '../common/errors/api-http.exception';
import { StorageService } from '../storage/storage.service';
import { progressPhotoFolder } from '../storage/constants';
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
import { UploadProgressPhotoResponseDto } from './dto/upload-progress-photo-response.dto';
import { UploadProgressPhotoDto } from './dto/upload-progress-photo.dto';
import { DeleteProgressPhotoDto } from './dto/delete-progress-photo.dto';
import { ProgressPhotosResponseDto } from './dto/progress-photos-response.dto';
import { currentYearMonth } from './utils/year-month';
import { groupProgressPhotos } from './utils/group-progress-photos';
import { cloneProgressPhotoMonths } from './utils/progress-photo-weight';
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
import type { GrantableSubscriptionPlan } from './types/subscription-plan.enum';
import {
  getCoachAthleteLimit,
  isPaidSubscriptionPlan,
} from './types/coach-athlete-limits';

export type CoachTrainingProgramExportFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

/** Subset of Multer file fields used by progress-photo uploads. */
type ProgressPhotoUploadFile = {
  buffer: Buffer;
  mimetype: string;
};

const ALLOWED_PROGRESS_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly invitesRepository: InvitesRepository,
    private readonly exercisesService: ExercisesService,
    private readonly excelService: ExcelService,
    private readonly zipService: ZipService,
    private readonly storageService: StorageService,
  ) {}

  // USERS

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  create(data: CreateUserData): Promise<Omit<User, 'password'>> {
    return this.usersRepository.create(data);
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

  async getEnrichedUserById(id: string): Promise<MeResponseDto> {
    const user = await this.syncSubscriptionIfExpired(
      await this.findByIdOrFail(id),
    );

    const {
      password: _password,
      trainingProgram,
      coachTrainingProgram,
      progressPhotos: _progressPhotos,
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
      currentWeightKg: user.currentWeightKg ?? null,
      coachQuota: await this.buildCoachQuota(user),
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
    const coach = await this.syncSubscriptionIfExpired(
      await this.findByIdOrFail(coachId),
    );
    await this.checkCoachAthleteQuota(coach);

    const athlete = await this.usersRepository.findByEmail(email);

    if (!athlete || athlete.role !== Role.Athlete) {
      throwApiNotFound(
        ApiErrorCode.AthleteNotFoundByEmail,
        'No athlete found with that email',
      );
    }

    const existingInvite = await this.invitesRepository.findPendingByAthleteId(
      athlete.id,
    );

    if (existingInvite) {
      throwApiConflict(
        ApiErrorCode.AthleteHasPendingInvite,
        'This athlete has a pending invitation',
      );
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

  async respondToCoachInvite(
    userId: string,
    action: CoachInviteResponseAction,
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);

    const pendingInvite =
      await this.invitesRepository.findPendingByAthleteId(userId);

    if (!pendingInvite) {
      throwApiConflict(
        ApiErrorCode.NoPendingCoachInvite,
        'No pending coach invitation',
      );
    }

    const accept = action === CoachInviteResponseAction.Accept;

    if (accept) {
      const coach = await this.syncSubscriptionIfExpired(
        await this.findByIdOrFail(pendingInvite.coachId),
      );

      try {
        await this.checkCoachAthleteQuota(coach, {
          asInvitee: true,
        });
      } catch (error) {
        // Coach is full: this invite and every other pending for that coach are dead.
        await this.invitesRepository.cancelPendingByCoachId(
          pendingInvite.coachId,
        );
        throw error;
      }
    }

    const status = accept ? InviteStatus.Accepted : InviteStatus.Rejected;

    await this.invitesRepository.updatePendingByAthleteId(userId, status);
    await this.usersRepository.applyCoachInviteResponse(
      userId,
      accept,
      pendingInvite.coachId,
    );

    if (accept) {
      const athleteCount = await this.usersRepository.countAthletesByCoachId(
        pendingInvite.coachId,
      );
      const coach = await this.findByIdOrFail(pendingInvite.coachId);
      const limit = getCoachAthleteLimit(coach.subscription.plan);

      if (athleteCount >= limit) {
        await this.invitesRepository.cancelPendingByCoachId(
          pendingInvite.coachId,
          userId,
        );
      }
    }

    return this.getEnrichedUserById(userId);
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

  async grantSubscription(
    userId: string,
    plan: GrantableSubscriptionPlan,
    expiresAt: Date,
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.setPaidSubscription(
      userId,
      plan,
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

  // STORAGE

  async uploadProgressPhoto(
    athleteId: string,
    files: {
      front?: ProgressPhotoUploadFile[];
      back?: ProgressPhotoUploadFile[];
    },
    dto: UploadProgressPhotoDto,
  ): Promise<UploadProgressPhotoResponseDto> {
    const frontFile = files?.front?.[0];
    const backFile = files?.back?.[0];

    if (!frontFile && !backFile) {
      throw new BadRequestException(
        'At least one image is required: front and/or back',
      );
    }

    this.assertProgressPhotoFile(frontFile);
    this.assertProgressPhotoFile(backFile);

    const user = await this.findByIdOrFail(athleteId);
    const yearMonth = currentYearMonth();
    const folder = progressPhotoFolder(athleteId, yearMonth);
    const progressPhotos = cloneProgressPhotoMonths(user.progressPhotos);

    let month = progressPhotos.find((entry) => entry.yearMonth === yearMonth);
    if (!month) {
      month = { yearMonth, weightKg: null, front: null, back: null };
      progressPhotos.push(month);
    }

    if (frontFile) {
      const uploaded = await this.storageService.uploadImage({
        buffer: frontFile.buffer,
        folder,
        publicId: 'front',
        overwrite: true,
      });
      month.front = {
        url: uploaded.secureUrl,
        publicId: uploaded.publicId,
        uploadedAt: new Date(),
      };
    }

    if (backFile) {
      const uploaded = await this.storageService.uploadImage({
        buffer: backFile.buffer,
        folder,
        publicId: 'back',
        overwrite: true,
      });
      month.back = {
        url: uploaded.secureUrl,
        publicId: uploaded.publicId,
        uploadedAt: new Date(),
      };
    }

    month.weightKg = dto.weightKg;

    await this.usersRepository.setProgressPhotos(athleteId, progressPhotos);

    return {
      yearMonth,
      weightKg: month.weightKg,
      front: month.front
        ? { url: month.front.url, uploadedAt: month.front.uploadedAt }
        : null,
      back: month.back
        ? { url: month.back.url, uploadedAt: month.back.uploadedAt }
        : null,
    };
  }

  async deleteProgressPhoto(
    athleteId: string,
    dto: DeleteProgressPhotoDto,
  ): Promise<UploadProgressPhotoResponseDto> {
    const user = await this.findByIdOrFail(athleteId);
    const { yearMonth, side } = dto;

    const progressPhotos = cloneProgressPhotoMonths(user.progressPhotos);

    const monthIndex = progressPhotos.findIndex(
      (entry) => entry.yearMonth === yearMonth,
    );
    if (monthIndex < 0) {
      throw new NotFoundException(`No progress photos for month ${yearMonth}`);
    }

    const month = progressPhotos[monthIndex];

    if (side) {
      const existing = month[side];
      if (!existing) {
        throw new NotFoundException(
          `No ${side} progress photo for month ${yearMonth}`,
        );
      }

      await this.storageService.deleteImage(existing.publicId, {
        ignoreNotFound: true,
      });
      month[side] = null;

      if (!month.front && !month.back) {
        month.weightKg = null;
        progressPhotos.splice(monthIndex, 1);
        await this.storageService.deleteFolder(
          progressPhotoFolder(athleteId, yearMonth),
        );
      }
    } else {
      await this.storageService.deleteFolder(
        progressPhotoFolder(athleteId, yearMonth),
      );
      progressPhotos.splice(monthIndex, 1);
      month.front = null;
      month.back = null;
      month.weightKg = null;
    }

    await this.usersRepository.setProgressPhotos(athleteId, progressPhotos);

    return {
      yearMonth,
      weightKg: month.weightKg ?? null,
      front: month.front
        ? { url: month.front.url, uploadedAt: month.front.uploadedAt }
        : null,
      back: month.back
        ? { url: month.back.url, uploadedAt: month.back.uploadedAt }
        : null,
    };
  }

  async getProgressPhotos(
    requester: { userId: string; role: Role },
    targetUserId: string,
    year?: number,
  ): Promise<ProgressPhotosResponseDto> {
    const target = await this.findByIdOrFail(targetUserId);

    const isSelf = requester.userId === targetUserId;
    const isAssignedCoach =
      requester.role === Role.Coach && target.coachId === requester.userId;

    if (!isSelf && !isAssignedCoach) {
      throw new ForbiddenException(
        'You can only view your own progress photos or those of your athletes',
      );
    }

    return groupProgressPhotos(target.progressPhotos ?? [], year);
  }

  // HELPERS

  private async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  private assertProgressPhotoFile(file?: ProgressPhotoUploadFile): void {
    if (!file) return;
    if (!file.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    if (!ALLOWED_PROGRESS_PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type: ${file.mimetype}. Allowed: jpeg, png, webp`,
      );
    }
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
   * If paid period already ended, persist free subscription so /me stays current.
   */
  private async syncSubscriptionIfExpired(
    user: UserDocument,
  ): Promise<UserDocument> {
    const { subscription } = user;
    if (!isPaidSubscriptionPlan(subscription.plan)) {
      return user;
    }

    const { expiresAt } = subscription;
    if (expiresAt != null && expiresAt.getTime() > Date.now()) {
      return user;
    }

    await this.usersRepository.clearSubscriptionToFree(user.id);
    user.subscription = {
      plan: SubscriptionPlan.Free,
      startedAt: null,
      expiresAt: null,
    };
    return user;
  }

  private async buildCoachQuota(
    user: UserDocument,
  ): Promise<MeResponseDto['coachQuota']> {
    if (user.role !== Role.Coach) {
      return null;
    }

    const athleteLimit = getCoachAthleteLimit(user.subscription.plan);
    const athleteCount = await this.usersRepository.countAthletesByCoachId(
      user.id,
    );

    return {
      athleteLimit,
      athleteCount,
      canInvite: athleteCount < athleteLimit,
    };
  }

  private async checkCoachAthleteQuota(
    coach: UserDocument,
    options?: { asInvitee?: boolean },
  ): Promise<void> {
    const limit = getCoachAthleteLimit(coach.subscription.plan);
    const athleteCount = await this.usersRepository.countAthletesByCoachId(
      coach.id,
    );

    if (athleteCount >= limit) {
      throwApiForbidden(
        ApiErrorCode.CoachAthleteQuotaFull,
        options?.asInvitee
          ? 'This coach has reached their athlete limit'
          : `Athlete limit reached for your plan (${athleteCount}/${limit})`,
        { athleteCount, limit },
      );
    }
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
