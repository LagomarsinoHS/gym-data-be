import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ExercisesService } from '../exercises/exercises.service';
import type { Exercise } from '../exercises/schemas/exercise.schema';
import type {
  MeCoachTrainingProgramDto,
  MeTrainingProgramItemDto,
} from '../users/dto/me-response.dto';
import type {
  CoachTrainingProgram,
  TrainingProgramExercise,
} from '../users/schemas/user.schema';
import { Role } from '../users/types/role.enum';
import { ApplyCoachTemplateDto } from './dto/apply-coach-template.dto';
import { CreateCoachTemplateDto } from './dto/create-coach-template.dto';
import { SetCoachTemplatesDto } from './dto/set-coach-templates.dto';
import { CoachTemplatesRepository } from './repositories/coach-templates.repository';

@Injectable()
export class CoachTemplatesService {
  constructor(
    private readonly coachTemplatesRepository: CoachTemplatesRepository,
    private readonly exercisesService: ExercisesService,
  ) {}

  async getCoachTemplates(coachId: string): Promise<{
    coachTemplates: MeCoachTrainingProgramDto[];
  }> {
    const coach = await this.findCoachOrFail(coachId);
    return {
      coachTemplates: await this.enrichTemplates(coach.coachTemplates ?? []),
    };
  }

  async setCoachTemplates(
    coachId: string,
    dto: SetCoachTemplatesDto,
  ): Promise<{ coachTemplates: MeCoachTrainingProgramDto[] }> {
    await this.findCoachOrFail(coachId);
    await this.coachTemplatesRepository.setCoachTemplates(
      coachId,
      dto.coachTemplates,
    );
    return this.getCoachTemplates(coachId);
  }

  /**
   * Creates a template; server assigns a stable UUID (client must not send id).
   */
  async createCoachTemplate(
    coachId: string,
    dto: CreateCoachTemplateDto,
  ): Promise<{ template: MeCoachTrainingProgramDto }> {
    const coach = await this.findCoachOrFail(coachId);
    const existing = coach.coachTemplates ?? [];
    const created: CoachTrainingProgram = {
      id: randomUUID(),
      name: dto.name.trim(),
      order: dto.order ?? existing.length,
      items: (dto.items ?? []).map((item, index) => ({
        exerciseId: item.exerciseId,
        order: item.order ?? index,
        sets: item.sets,
        reps: item.reps,
        rest: item.rest,
        notes: item.notes,
      })),
    };

    await this.coachTemplatesRepository.setCoachTemplates(coachId, [
      ...existing,
      created,
    ]);

    const [template] = await this.enrichTemplates([created]);
    return { template };
  }

  /**
   * Copies templates onto athlete plans (cartesian).
   * Session id = template id. One write per athlete. Skips pairs already present.
   */
  async applyCoachTemplates(
    coachId: string,
    dto: ApplyCoachTemplateDto,
  ): Promise<{
    applied: { athleteId: string; templateId: string }[];
    skipped: { athleteId: string; templateId: string }[];
    failedAthletes: string[];
    failedTemplates: string[];
    sessions: MeCoachTrainingProgramDto[];
  }> {
    const coach = await this.findCoachOrFail(coachId);
    const templatesById = new Map(
      (coach.coachTemplates ?? []).map((t) => [t.id, t]),
    );

    const templateIds = [
      ...new Set(dto.templateIds.map((id) => id.trim()).filter(Boolean)),
    ];
    const athleteIds = [
      ...new Set(dto.athleteIds.map((id) => id.trim()).filter(Boolean)),
    ];

    const failedTemplates: string[] = [];
    const validTemplateIds: string[] = [];
    for (const templateId of templateIds) {
      if (templatesById.has(templateId)) validTemplateIds.push(templateId);
      else failedTemplates.push(templateId);
    }

    const applied: { athleteId: string; templateId: string }[] = [];
    const skipped: { athleteId: string; templateId: string }[] = [];
    const failedAthletes: string[] = [];
    const appliedSeedsByTemplateId = new Map<string, CoachTrainingProgram>();

    for (const athleteId of athleteIds) {
      const athlete =
        await this.coachTemplatesRepository.findUserById(athleteId);

      if (
        !athlete ||
        athlete.role !== Role.Athlete ||
        athlete.coachId !== coachId
      ) {
        failedAthletes.push(athleteId);
        continue;
      }

      const program = [...(athlete.coachTrainingProgram ?? [])];
      let changed = false;

      for (const templateId of validTemplateIds) {
        if (program.some((s) => s.id === templateId)) {
          skipped.push({ athleteId, templateId });
          continue;
        }

        const template = templatesById.get(templateId)!;
        const seed = {
          ...this.toPersistableSession(template),
          order: program.length,
        };
        program.push(seed);
        applied.push({ athleteId, templateId });
        if (!appliedSeedsByTemplateId.has(templateId)) {
          appliedSeedsByTemplateId.set(templateId, seed);
        }
        changed = true;
      }

      if (changed) {
        await this.coachTemplatesRepository.setCoachTrainingProgram(
          athleteId,
          program,
        );
      }
    }

    const sessions = appliedSeedsByTemplateId.size
      ? await this.enrichTemplates([...appliedSeedsByTemplateId.values()])
      : [];

    return {
      applied,
      skipped,
      failedAthletes,
      failedTemplates,
      sessions,
    };
  }

  private toPersistableSession(
    template: CoachTrainingProgram,
  ): CoachTrainingProgram {
    return {
      id: template.id,
      name: template.name,
      order: template.order,
      items: (template.items ?? []).map((item, index) => ({
        exerciseId: item.exerciseId,
        order: item.order ?? index,
        sets: item.sets,
        reps: item.reps,
        rest: item.rest,
        notes: item.notes,
      })),
    };
  }

  private async findCoachOrFail(coachId: string) {
    const coach = await this.coachTemplatesRepository.findCoachById(coachId);
    if (!coach) {
      throw new NotFoundException(`User with ID ${coachId} not found`);
    }
    return coach;
  }

  private async enrichTemplates(
    templates: CoachTrainingProgram[],
  ): Promise<MeCoachTrainingProgramDto[]> {
    const exerciseIds = [
      ...new Set(
        templates.flatMap((session) =>
          (session.items ?? []).map((item) => item.exerciseId),
        ),
      ),
    ];
    const catalog = await this.exercisesService.getExercisesByIds(exerciseIds);
    const byId = new Map(catalog.map((e) => [e.id, e]));
    return this.enrichCoachTrainingProgram(templates, byId);
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
}
