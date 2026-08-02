export type ExcelTrainingProgramItem = {
  exerciseId: string;
  order?: number;
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
  /** Display name already resolved from the catalog (e.g. Spanish). */
  exerciseName?: string;
};

export type ExcelCoachTrainingProgram = {
  id: string;
  name: string;
  order: number;
  items: ExcelTrainingProgramItem[];
};

/** Input for building one athlete workbook (no Nest/users coupling). */
export type AthleteTrainingProgramExport = {
  firstName: string;
  lastName: string;
  coachTrainingProgram: ExcelCoachTrainingProgram[];
};
