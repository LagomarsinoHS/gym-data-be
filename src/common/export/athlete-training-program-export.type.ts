export type TrainingProgramExportItem = {
  exerciseId: string;
  order?: number;
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
  /** Display name already resolved from the catalog (e.g. Spanish). */
  exerciseName?: string;
  /** Catalog category used to group rows (e.g. chest, back). */
  category?: string;
};

export type CoachTrainingProgramExport = {
  id: string;
  name: string;
  order: number;
  items: TrainingProgramExportItem[];
};

/** Input for building one athlete workbook/PDF (no Nest/users coupling). */
export type AthleteTrainingProgramExport = {
  firstName: string;
  lastName: string;
  coachTrainingProgram: CoachTrainingProgramExport[];
};
