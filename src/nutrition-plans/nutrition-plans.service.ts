import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Role } from '../users/types/role.enum';
import { UsersService } from '../users/users.service';
import {
  CreateNutritionPlanDto,
  ListNutritionPlansQueryDto,
  NutritionPlanDto,
  toNutritionPlanDto,
  UpdateNutritionPlanDto,
} from './dto/nutrition-plan.dto';
import { NutritionPlansRepository } from './repositories/nutrition-plans.repository';
import type { NutritionPlanDocument } from './schemas/nutrition-plan.schema';
import { NutritionPlanStatus } from './types/nutrition-plan-status.enum';

@Injectable()
export class NutritionPlansService {
  constructor(
    private readonly plansRepository: NutritionPlansRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(
    coachId: string,
    dto: CreateNutritionPlanDto,
  ): Promise<NutritionPlanDto> {
    const athlete = await this.usersService.requireAssignedAthlete(
      coachId,
      dto.athleteId,
    );
    const coach = await this.usersService.getPersonSnapshot(coachId);

    const created = await this.plansRepository.create({
      id: randomUUID(),
      athlete: {
        id: athlete.id,
        firstName: String(athlete.profile?.firstName || '').trim(),
        lastName: String(athlete.profile?.lastName || '').trim(),
      },
      coach,
      title: dto.title.trim(),
      status: NutritionPlanStatus.Active,
      goal: dto.goal ?? null,
      validFrom: dto.validFrom,
      validUntil: dto.validUntil ?? null,
      targets: dto.targets,
      meals: (dto.meals ?? []).map((meal) => ({
        name: meal.name.trim(),
        time: meal.time || null,
        foods: (meal.foods ?? []).map((food) => ({
          name: food.name.trim(),
          quantity: food.quantity,
          unit: food.unit.trim(),
        })),
        notes: meal.notes?.trim() || null,
      })),
      generalNotes: dto.generalNotes?.trim() || null,
    });

    return toNutritionPlanDto(created);
  }

  async list(
    userId: string,
    role: Role,
    query: ListNutritionPlansQueryDto,
  ): Promise<NutritionPlanDto[]> {
    if (role === Role.Athlete) {
      const plans = await this.plansRepository.findMany({
        athleteId: userId,
        status: query.status,
      });
      return plans.map(toNutritionPlanDto);
    }

    if (role !== Role.Coach) {
      throw new ForbiddenException('Requires athlete or coach role');
    }

    const athleteId = query.athleteId?.trim();
    if (!athleteId) {
      throw new BadRequestException('athleteId is required for coaches');
    }

    await this.usersService.requireAssignedAthlete(userId, athleteId);
    const plans = await this.plansRepository.findMany({
      athleteId,
      coachId: userId,
      status: query.status,
    });
    return plans.map(toNutritionPlanDto);
  }

  async getById(
    userId: string,
    role: Role,
    planId: string,
  ): Promise<NutritionPlanDto> {
    const plan = await this.loadVisiblePlan(userId, role, planId);
    return toNutritionPlanDto(plan);
  }

  async update(
    coachId: string,
    planId: string,
    dto: UpdateNutritionPlanDto,
  ): Promise<NutritionPlanDto> {
    const plan = await this.loadCoachOwnedPlan(coachId, planId);
    if (plan.status === NutritionPlanStatus.Archived) {
      throw new ConflictException('Archived nutrition plans cannot be edited');
    }

    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.goal !== undefined) patch.goal = dto.goal;
    if (dto.validFrom !== undefined) patch.validFrom = dto.validFrom;
    if (dto.validUntil !== undefined) patch.validUntil = dto.validUntil;
    if (dto.targets !== undefined) patch.targets = dto.targets;
    if (dto.meals !== undefined) {
      patch.meals = dto.meals.map((meal) => ({
        name: meal.name.trim(),
        time: meal.time || null,
        foods: (meal.foods ?? []).map((food) => ({
          name: food.name.trim(),
          quantity: food.quantity,
          unit: food.unit.trim(),
        })),
        notes: meal.notes?.trim() || null,
      }));
    }
    if (dto.generalNotes !== undefined) {
      patch.generalNotes = dto.generalNotes?.trim() || null;
    }

    const updated = await this.plansRepository.updateById(planId, patch);
    if (!updated) throw new NotFoundException('Nutrition plan not found');
    return toNutritionPlanDto(updated);
  }

  async archive(coachId: string, planId: string): Promise<NutritionPlanDto> {
    const plan = await this.loadCoachOwnedPlan(coachId, planId);
    if (plan.status === NutritionPlanStatus.Archived) {
      return toNutritionPlanDto(plan);
    }

    const updated = await this.plansRepository.updateById(planId, {
      status: NutritionPlanStatus.Archived,
    });
    if (!updated) throw new NotFoundException('Nutrition plan not found');
    return toNutritionPlanDto(updated);
  }

  async softDelete(athleteId: string, planId: string): Promise<void> {
    const plan = await this.loadVisiblePlan(athleteId, Role.Athlete, planId);
    if (plan.status !== NutritionPlanStatus.Archived) {
      throw new ConflictException('Only archived nutrition plans can be deleted');
    }

    const updated = await this.plansRepository.updateById(planId, {
      deletedAt: new Date(),
    });
    if (!updated) throw new NotFoundException('Nutrition plan not found');
  }

  private async loadVisiblePlan(
    userId: string,
    role: Role,
    planId: string,
  ): Promise<NutritionPlanDocument> {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) throw new NotFoundException('Nutrition plan not found');

    if (role === Role.Athlete) {
      if (plan.athlete.id !== userId) {
        throw new NotFoundException('Nutrition plan not found');
      }
      return plan;
    }

    if (role === Role.Coach) {
      await this.usersService.requireAssignedAthlete(userId, plan.athlete.id);
      if (plan.coach.id !== userId) {
        throw new NotFoundException('Nutrition plan not found');
      }
      return plan;
    }

    throw new ForbiddenException('Requires athlete or coach role');
  }

  private async loadCoachOwnedPlan(
    coachId: string,
    planId: string,
  ): Promise<NutritionPlanDocument> {
    return this.loadVisiblePlan(coachId, Role.Coach, planId);
  }
}
