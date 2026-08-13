import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiErrorCode } from '../common/errors/api-error-code';
import {
  throwApiConflict,
  throwApiError,
  throwApiForbidden,
} from '../common/errors/api-http.exception';
import { StorageService } from '../storage/storage.service';
import {
  PROFILE_PHOTO_PUBLIC_ID,
  profilePhotoFolder,
  progressPhotoFolder,
} from '../storage/constants';
import { HashingService } from '../common/hashing/hashing.service';
import { UsersRepository } from './repositories/users.repository';
import { InvitesRepository } from './repositories/invites.repository';
import {
  AthleteNutrition,
  CoachTrainingProgram,
  ProgressPhoto,
  ProgressPhotoMonth,
  TrainingProgramExercise,
  User,
  UserDocument,
} from './schemas/user.schema';
import type { Invite } from './schemas/invite.schema';
import { CreateUserData } from './types/create-user-data.type';
import {
  MeCoachTrainingProgramDto,
  MePendingCoachInviteDto,
  MePendingCoachSummaryDto,
  MeProfilePhotoDto,
  MeResponseDto,
  MeTrainingProgramItemDto,
  PendingCoachInviteResponseDto,
} from './dto/me-response.dto';
import { CoachAthleteListItemDto } from './dto/coach-athlete-list-item.dto';
import { CoachInviteListItemDto } from './dto/coach-invite-list-item.dto';
import { OkResponseDto } from './dto/ok-response.dto';
import { CoachInviteResponseAction } from './dto/respond-coach-invite.dto';
import { ExportCoachTrainingProgramDto } from './dto/export-coach-training-program.dto';
import type { ExportCoachTrainingProgramFormat } from './types/export-coach-training-program-format';
import { SetCoachTrainingProgramDto } from './dto/set-coach-training-program.dto';
import {
  AthleteNutritionDto,
  SetAthleteNutritionDto,
  toAthleteNutritionDto,
} from './dto/athlete-nutrition.dto';
import { normalizeFoodTags } from './utils/normalize-food-tag';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadProgressPhotoResponseDto } from './dto/upload-progress-photo-response.dto';
import { UploadProgressPhotoDto } from './dto/upload-progress-photo.dto';
import { ProgressPhotosResponseDto } from './dto/progress-photos-response.dto';
import {
  AnalyzeProgressPhotosDto,
  AnalyzeProgressPhotosResponseDto,
} from './dto/analyze-progress-photos.dto';
import { currentYearMonth } from './utils/year-month';
import { groupProgressPhotos } from './utils/group-progress-photos';
import { cloneProgressPhotoMonths } from './utils/progress-photo-weight';
import {
  DEFAULT_EXPORT_LOCALE,
  TRAINING_PROGRAM_EXPORT_HEADERS,
  type ExportLocale,
} from '../common/export/training-program-export-headers';
import { ExcelService } from '../excel/excel.service';
import type { AthleteTrainingProgramExport } from '../common/export/athlete-training-program-export.type';
import { PdfService } from '../pdf/pdf.service';
import { ExercisesService } from '../exercises/exercises.service';
import { Exercise } from '../exercises/schemas/exercise.schema';
import type { AiService } from '../ai/ai.service';
import { AI_SERVICE } from '../ai/ai.tokens';
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

const EXPORT_CONTENT_TYPES: Record<ExportCoachTrainingProgramFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly invitesRepository: InvitesRepository,
    @Inject(forwardRef(() => ExercisesService))
    private readonly exercisesService: ExercisesService,
    private readonly excelService: ExcelService,
    private readonly pdfService: PdfService,
    private readonly zipService: ZipService,
    private readonly storageService: StorageService,
    private readonly hashingService: HashingService,
    @Inject(AI_SERVICE) private readonly aiService: AiService,
  ) {}

  // USERS

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  create(data: CreateUserData): Promise<Omit<User, 'password'>> {
    return this.usersRepository.create(data);
  }

  touchLastLoginAt(userId: string): Promise<void> {
    return this.usersRepository.touchLastLoginAt(userId);
  }

  /**
   * Soft-delete by email after verifying it belongs to the JWT user.
   * Only sets `deletedAt`; leaves coachId and related data intact.
   */
  async softDeleteAccount(
    requesterUserId: string,
    email: string,
  ): Promise<OkResponseDto> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    if (user.id !== requesterUserId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    await this.usersRepository.softDeleteById(user.id);
    return { ok: true };
  }

  /**
   * Athlete unlinks their assigned coach. Does not clear nutrition or plans.
   */
  async leaveCoach(athleteId: string): Promise<MeResponseDto> {
    const athlete = await this.findByIdOrFail(athleteId);
    if (!athlete.coachId) {
      throwApiConflict(
        ApiErrorCode.NoCoachAssigned,
        'No coach is assigned to this athlete',
      );
    }

    await this.usersRepository.clearAthleteCoach(athleteId);
    return this.getEnrichedUserById(athleteId);
  }

  /**
   * Ensures the user has an active paid plan (not free / not expired).
   */
  async requirePaidSubscription(userId: string): Promise<void> {
    const user = await this.syncSubscriptionIfExpired(
      await this.findByIdOrFail(userId),
    );
    if (!isPaidSubscriptionPlan(user.subscription.plan)) {
      throwApiForbidden(
        ApiErrorCode.PaidSubscriptionRequired,
        'A paid subscription is required',
      );
    }
  }

  /**
   * Partial self-update: profile fields, goal, and/or password.
   * Password change requires a valid currentPassword.
   * Optional profile fields / goal accept `null` to clear.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<MeResponseDto> {
    const user = await this.findByIdOrFail(userId);
    const patch: {
      password?: string;
      goal?: string | null;
      profile?: {
        firstName?: string;
        lastName?: string;
        heightCm?: number | null;
        sex?: string | null;
        birthDate?: string | null;
      };
    } = {};

    if (dto.profile) {
      const profile: NonNullable<typeof patch.profile> = {};
      if (dto.profile.firstName !== undefined) {
        profile.firstName = dto.profile.firstName;
      }
      if (dto.profile.lastName !== undefined) {
        profile.lastName = dto.profile.lastName;
      }
      if (dto.profile.heightCm !== undefined) {
        profile.heightCm = dto.profile.heightCm;
      }
      if (dto.profile.sex !== undefined) {
        profile.sex = dto.profile.sex;
      }
      if (dto.profile.birthDate !== undefined) {
        profile.birthDate = dto.profile.birthDate;
      }
      if (Object.keys(profile).length > 0) {
        patch.profile = profile;
      }
    }
    if (dto.goal !== undefined) {
      patch.goal = dto.goal;
    }

    if (dto.newPassword) {
      const valid = await this.hashingService.verify(
        user.password,
        dto.currentPassword ?? '',
      );
      if (!valid) {
        throwApiError(
          HttpStatus.BAD_REQUEST,
          ApiErrorCode.CurrentPasswordIncorrect,
          'Current password is incorrect',
        );
      }
      patch.password = await this.hashingService.hash(dto.newPassword);
    }

    await this.usersRepository.updateProfileFields(userId, patch);
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

  async getEnrichedUserById(id: string): Promise<MeResponseDto> {
    const user = await this.syncSubscriptionIfExpired(
      await this.findByIdOrFail(id),
    );

    const {
      password: _password,
      trainingProgram,
      coachTrainingProgram,
      coachTemplates: _coachTemplates,
      progressPhotos: _progressPhotos,
      nutrition: _nutrition,
      profilePhoto,
      profile,
      ...safeUser
    } = user.toObject();

    const ids = [
      ...trainingProgram.map((item) => item.exerciseId),
      ...coachTrainingProgram.flatMap((session) =>
        session.items.map((item) => item.exerciseId),
      ),
    ];
    const catalog = await this.exercisesService.getExercisesByIds(ids);
    const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));

    return {
      ...safeUser,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        heightCm: profile.heightCm ?? null,
        sex: profile.sex ?? null,
        birthDate: profile.birthDate ?? null,
      },
      goal: user.goal ?? null,
      profilePhoto: this.toMeProfilePhoto(profilePhoto),
      coach: await this.resolveAssignedCoach(user.coachId),
      currentWeightKg: user.currentWeightKg ?? null,
      lastLoginAt: user.lastLoginAt,
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

    await this.invitesRepository.deleteExpiredPending();

    const pendingInvite =
      await this.invitesRepository.findPendingByAthleteId(userId);

    if (!pendingInvite) return { invite: null };

    const coach = await this.usersRepository.findById(pendingInvite.coachId);
    return {
      invite: this.enrichPendingCoachInvite(pendingInvite, coach),
    };
  }

  /**
   * Invite by email. Athlete may not exist yet (pre-register pending).
   * Pending invites expire after 24h if unanswered.
   */
  async createCoachInvite(
    coachId: string,
    email: string,
  ): Promise<OkResponseDto> {
    const coach = await this.syncSubscriptionIfExpired(
      await this.findByIdOrFail(coachId),
    );
    await this.checkCoachAthleteQuota(coach);
    await this.invitesRepository.deleteExpiredPending();

    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser && existingUser.role !== Role.Athlete) {
      throwApiConflict(
        ApiErrorCode.EmailNotAnAthlete,
        'That email belongs to a non-athlete account',
      );
    }

    const athlete = existingUser?.role === Role.Athlete ? existingUser : null;

    if (athlete?.coachId) {
      if (athlete.coachId === coachId) {
        throwApiConflict(
          ApiErrorCode.AlreadyYourAthlete,
          'This athlete is already assigned to you',
        );
      }
      throwApiConflict(
        ApiErrorCode.AthleteAlreadyHasCoach,
        'This athlete already has an assigned coach',
      );
    }

    const existingInvite =
      (await this.invitesRepository.findPendingByEmail(email)) ??
      (athlete
        ? await this.invitesRepository.findPendingByAthleteId(athlete.id)
        : null);

    if (existingInvite) {
      throwApiConflict(
        ApiErrorCode.AthleteHasPendingInvite,
        'This athlete has a pending invitation',
      );
    }

    await this.invitesRepository.create({
      id: randomUUID(),
      coachId,
      athleteId: athlete?.id ?? null,
      email: athlete?.email ?? email,
      invitedAt: new Date(),
    });

    return { ok: true };
  }

  /**
   * After an athlete registers, attach any pending invite created for their email.
   */
  async linkPendingInvitesForNewAthlete(
    athleteId: string,
    email: string,
  ): Promise<void> {
    await this.invitesRepository.deleteExpiredPending();
    await this.invitesRepository.linkAthleteIdByEmail(email, athleteId);
  }

  async respondToCoachInvite(
    userId: string,
    action: CoachInviteResponseAction,
  ): Promise<MeResponseDto> {
    await this.findByIdOrFail(userId);
    await this.invitesRepository.deleteExpiredPending();

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
  ): Promise<{ data: CoachAthleteListItemDto[]; total: number }> {
    const skip = (page - 1) * limit;
    const [athletes, total] = await Promise.all([
      this.usersRepository.findAthletesByCoachId(coachId, skip, limit, search),
      this.usersRepository.countAthletesByCoachId(coachId, search),
    ]);

    const exerciseIds = new Set<string>();
    for (const athlete of athletes) {
      for (const session of athlete.coachTrainingProgram ?? []) {
        for (const item of session.items ?? []) {
          exerciseIds.add(item.exerciseId);
        }
      }
    }

    const catalog = await this.exercisesService.getExercisesByIds([
      ...exerciseIds,
    ]);
    const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));

    const data: CoachAthleteListItemDto[] = athletes.map((athlete) => {
      const { profile } = athlete;
      return {
        id: athlete.id,
        email: athlete.email,
        goal: athlete.goal ?? null,
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          heightCm: profile.heightCm ?? null,
          sex: profile.sex ?? null,
          birthDate: profile.birthDate ?? null,
        },
        currentWeightKg: athlete.currentWeightKg ?? null,
        coachTrainingProgram: this.enrichCoachTrainingProgram(
          athlete.coachTrainingProgram ?? [],
          byId,
        ),
      };
    });

    return { data, total };
  }

  async getCoachInvites(
    coachId: string,
    page: number,
    limit: number,
    status?: InviteStatus,
  ): Promise<{ data: CoachInviteListItemDto[]; total: number }> {
    await this.invitesRepository.deleteExpiredPending();

    const skip = (page - 1) * limit;
    const { invites, total } = await this.invitesRepository.findByCoachId(
      coachId,
      skip,
      limit,
      status,
    );

    const athleteIds = invites
      .map((invite) => invite.athleteId)
      .filter((id): id is string => Boolean(id));
    const athletes = await this.usersRepository.findByIds(athleteIds);
    const athleteById = new Map(athletes.map((a) => [a.id, a]));

    const data = invites.map((invite) => {
      const athlete = invite.athleteId
        ? athleteById.get(invite.athleteId)
        : undefined;
      return {
        id: invite.id,
        athleteId: invite.athleteId ?? null,
        email: invite.email,
        status: invite.status,
        invitedAt: invite.invitedAt,
        respondedAt: invite.respondedAt ?? null,
        athlete: athlete
          ? {
              firstName: athlete.profile.firstName,
              lastName: athlete.profile.lastName,
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

  async getAthleteNutrition(
    coachId: string,
    athleteId: string,
  ): Promise<AthleteNutritionDto> {
    const athlete = await this.assertCoachOwnsAthlete(coachId, athleteId);
    return toAthleteNutritionDto(athlete.nutrition);
  }

  async setAthleteNutrition(
    coachId: string,
    athleteId: string,
    dto: SetAthleteNutritionDto,
  ): Promise<AthleteNutritionDto> {
    await this.assertCoachOwnsAthlete(coachId, athleteId);
    const coach = await this.findByIdOrFail(coachId);

    const nutrition: AthleteNutrition = {
      dailyActivity: dto.dailyActivity ?? null,
      trainingsPerWeek: dto.trainingsPerWeek ?? null,
      avgDurationMin: dto.avgDurationMin ?? null,
      dailySteps: dto.dailySteps ?? null,
      weeklyCardioMin: dto.weeklyCardioMin ?? null,
      extraActivity: dto.extraActivity?.trim() || null,
      trainingTime: dto.trainingTime ?? null,
      trainFasted: dto.trainFasted ?? null,
      meals: (dto.meals ?? []).map((meal) => ({
        name: meal.name.trim(),
        time: meal.time || null,
      })),
      likes: normalizeFoodTags(dto.likes),
      avoids: normalizeFoodTags(dto.avoids),
      dietType: dto.dietType ?? null,
      restrictions: normalizeFoodTags(dto.restrictions),
      notes: dto.notes?.trim() || null,
      updatedAt: new Date(),
      updatedBy: {
        id: coach.id,
        firstName: String(coach.profile?.firstName || '').trim(),
        lastName: String(coach.profile?.lastName || '').trim(),
      },
    };

    await this.usersRepository.setAthleteNutrition(athleteId, nutrition);
    return toAthleteNutritionDto(nutrition);
  }

  async requireAssignedAthlete(
    coachId: string,
    athleteId: string,
  ): Promise<UserDocument> {
    return this.assertCoachOwnsAthlete(coachId, athleteId);
  }

  async getPersonSnapshot(
    userId: string,
  ): Promise<{ id: string; firstName: string; lastName: string }> {
    const user = await this.findByIdOrFail(userId);
    return {
      id: user.id,
      firstName: String(user.profile?.firstName || '').trim(),
      lastName: String(user.profile?.lastName || '').trim(),
    };
  }

  private async assertCoachOwnsAthlete(
    coachId: string,
    athleteId: string,
  ): Promise<UserDocument> {
    const athlete = await this.findByIdOrFail(athleteId);

    if (athlete.role !== Role.Athlete) {
      throw new NotFoundException('Athlete not found');
    }

    if (athlete.coachId !== coachId) {
      throw new ForbiddenException(
        'You can only edit athletes assigned to you',
      );
    }

    return athlete;
  }

  async exportCoachTrainingPrograms(
    coachId: string,
    dto: ExportCoachTrainingProgramDto,
  ): Promise<CoachTrainingProgramExportFile> {
    const locale = dto.locale ?? DEFAULT_EXPORT_LOCALE;
    // Avoid reading `dto.format` directly: some IDE TS programs resolve that
    // property as `error` and poison @typescript-eslint no-unsafe-* rules.
    const exportFormat: ExportCoachTrainingProgramFormat =
      (dto as unknown as { format?: string }).format === 'pdf' ? 'pdf' : 'xlsx';
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
        exportFormat === 'pdf'
          ? await this.pdfService.buildAthleteTrainingProgramPdf(
              exportData,
              locale,
            )
          : await this.excelService.buildAthleteTrainingProgramWorkbook(
              exportData,
              locale,
            );
      if (!buffer) {
        continue;
      }

      files.push({
        filename: this.toExportFilename(
          athlete.profile.firstName,
          athlete.profile.lastName,
          exportFormat,
        ),
        buffer,
      });
    }

    if (files.length === 0) {
      throw new NotFoundException('No training programs to export');
    }

    return files.length === 1
      ? {
          buffer: files[0].buffer,
          contentType: EXPORT_CONTENT_TYPES[exportFormat],
          filename: files[0].filename,
        }
      : {
          buffer: await this.zipService.buildZip(files),
          contentType: 'application/zip',
          filename: `${TRAINING_PROGRAM_EXPORT_HEADERS[locale].fileName}.zip`,
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
    startedAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.setPaidSubscription(
      userId,
      plan,
      startedAt,
      expiresAt,
    );
  }

  async revokeSubscription(userId: string): Promise<void> {
    await this.findByIdOrFail(userId);
    await this.usersRepository.clearSubscriptionToFree(userId);
  }

  getAdminStats() {
    return this.usersRepository.getAdminStats();
  }

  async listAdminUsers(
    page: number,
    limit: number,
    filters: {
      search?: string;
      role?: Role;
      plan?: SubscriptionPlan;
      expiringSoon?: boolean;
      sortBy?: 'lastLoginAt' | 'createdAt';
      sortDir?: 'asc' | 'desc';
    },
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.usersRepository.findAdminUsers(skip, limit, filters),
      this.usersRepository.countAdminUsers(filters),
    ]);
    return { data, total };
  }

  /**
   * Admin soft-delete: sets `deletedAt` only (same as self-delete).
   * Cannot soft-delete your own admin account via this path.
   */
  async adminSoftDeleteUser(
    requesterUserId: string,
    targetUserId: string,
  ): Promise<OkResponseDto> {
    if (requesterUserId === targetUserId) {
      throw new ForbiddenException(
        'You cannot soft-delete your own account here',
      );
    }

    const user = await this.findByIdOrFail(targetUserId);
    await this.usersRepository.softDeleteById(user.id);
    return { ok: true };
  }

  // STORAGE

  /**
   * Upload / replace profile photo.
   * Cloudinary: gym-app/profiles/{userId}/profilePhoto (overwrite).
   */
  async uploadProfilePhoto(
    userId: string,
    file?: ProgressPhotoUploadFile,
  ): Promise<MeResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    this.validateUploadedImageFile(file);

    await this.findByIdOrFail(userId);

    const uploaded = await this.storageService.uploadImage({
      buffer: file.buffer,
      folder: profilePhotoFolder(userId),
      publicId: PROFILE_PHOTO_PUBLIC_ID,
      overwrite: true,
    });

    const profilePhoto: ProgressPhoto = {
      url: uploaded.secureUrl,
      publicId: uploaded.publicId,
      uploadedAt: new Date(),
    };

    await this.usersRepository.setProfilePhoto(userId, profilePhoto);
    return this.getEnrichedUserById(userId);
  }

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

    this.validateUploadedImageFile(frontFile);
    this.validateUploadedImageFile(backFile);

    const user = await this.findByIdOrFail(athleteId);
    const yearMonth = dto.yearMonth?.trim() || currentYearMonth();
    if (yearMonth > currentYearMonth()) {
      throw new BadRequestException('"yearMonth" cannot be in the future');
    }
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

  /**
   * AI analysis of two progress months (front + back Cloudinary URLs).
   * Coach + paid subscription enforced by guards; coach must own the athlete.
   */
  async analyzeProgressPhotos(
    coachId: string,
    athleteId: string,
    dto: AnalyzeProgressPhotosDto,
  ): Promise<AnalyzeProgressPhotosResponseDto> {
    const athlete = await this.findByIdOrFail(athleteId);

    if (athlete.role !== Role.Athlete || athlete.coachId !== coachId) {
      throw new ForbiddenException(
        'You can only analyze progress photos of your athletes',
      );
    }

    const [firstYearMonth, secondYearMonth] = dto.yearMonths;
    const olderYearMonth =
      firstYearMonth < secondYearMonth ? firstYearMonth : secondYearMonth;
    const newerYearMonth =
      firstYearMonth < secondYearMonth ? secondYearMonth : firstYearMonth;

    const months = athlete.progressPhotos;
    const older = months.find((m) => m.yearMonth === olderYearMonth) ?? null;
    const newer = months.find((m) => m.yearMonth === newerYearMonth) ?? null;

    if (!older || !newer) {
      throw new BadRequestException(
        'Both months must exist in the athlete progress photos',
      );
    }

    const olderUrls = this.progressMonthPhotoUrls(older);
    const newerUrls = this.progressMonthPhotoUrls(newer);

    if (olderUrls.length === 0 || newerUrls.length === 0) {
      throw new BadRequestException(
        'Both months must have at least one progress photo',
      );
    }

    const result = await this.aiService.analyzeProgressPhotos({
      locale: dto.locale,
      older: {
        yearMonth: older.yearMonth,
        weightKg: older.weightKg ?? null,
        photoUrls: olderUrls,
      },
      newer: {
        yearMonth: newer.yearMonth,
        weightKg: newer.weightKg ?? null,
        photoUrls: newerUrls,
      },
    });

    return { sections: result.sections };
  }

  // HELPERS

  private progressMonthPhotoUrls(month: ProgressPhotoMonth): string[] {
    const urls: string[] = [];
    if (month.front?.url) urls.push(month.front.url);
    if (month.back?.url) urls.push(month.back.url);
    return urls;
  }

  private async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  private validateUploadedImageFile(file?: ProgressPhotoUploadFile): void {
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

  private toMeProfilePhoto(
    profilePhoto?: ProgressPhoto | null,
  ): MeProfilePhotoDto | null {
    if (!profilePhoto?.url) return null;
    return {
      url: profilePhoto.url,
      uploadedAt: profilePhoto.uploadedAt,
    };
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
    coach: Pick<User, 'profile'> | null,
  ): MePendingCoachInviteDto | null {
    if (!invite || !coach) return null;

    return {
      coachId: invite.coachId,
      invitedAt: invite.invitedAt,
      coach: {
        firstName: coach.profile.firstName,
        lastName: coach.profile.lastName,
      },
    };
  }

  private async resolveAssignedCoach(
    coachId: string | null | undefined,
  ): Promise<MePendingCoachSummaryDto | null> {
    if (!coachId) return null;
    const coach = await this.usersRepository.findById(coachId);
    if (!coach) return null;
    return {
      firstName: coach.profile.firstName,
      lastName: coach.profile.lastName,
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
    athlete: Pick<User, 'profile' | 'coachTrainingProgram'>,
    byId: Map<string, Exercise>,
    locale: ExportLocale,
  ): AthleteTrainingProgramExport {
    return {
      firstName: athlete.profile.firstName,
      lastName: athlete.profile.lastName,
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
            category: found?.category,
          };
        }),
      })),
    };
  }

  private toExportFilename(
    firstName: string,
    lastName: string,
    format: ExportCoachTrainingProgramFormat = 'xlsx',
  ): string {
    const base = `${firstName}-${lastName}`
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `${base}.${format}`;
  }
}
