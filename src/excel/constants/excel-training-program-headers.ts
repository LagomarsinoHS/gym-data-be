export type ExcelLocale = 'es' | 'en';

export const DEFAULT_EXCEL_LOCALE: ExcelLocale = 'es';

export const EXCEL_TRAINING_PROGRAM_HEADERS = {
  es: {
    exercise: 'Ejercicio',
    sets: 'Series',
    reps: 'Reps',
    rest: 'Descanso',
    notes: 'Notas',
    fileName: 'Pautas de entrenamientos',
  },
  en: {
    exercise: 'Exercise',
    sets: 'Sets',
    reps: 'Reps',
    rest: 'Rest',
    notes: 'Notes',
    fileName: 'Training Programs',
  },
} as const satisfies Record<
  ExcelLocale,
  {
    exercise: string;
    sets: string;
    reps: string;
    rest: string;
    notes: string;
    fileName: string;
  }
>;
