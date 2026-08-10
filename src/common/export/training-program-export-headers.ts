export type ExportLocale = 'es' | 'en';

export const DEFAULT_EXPORT_LOCALE: ExportLocale = 'es';

export const TRAINING_PROGRAM_EXPORT_HEADERS = {
  es: {
    exercise: 'Ejercicio',
    sets: 'Series',
    reps: 'Reps',
    rest: 'Descanso',
    notes: 'Notas',
    totalSets: 'TOTAL SERIES DEL DÍA',
    otherGroup: 'Otros',
    fileName: 'Pautas de entrenamientos',
  },
  en: {
    exercise: 'Exercise',
    sets: 'Sets',
    reps: 'Reps',
    rest: 'Rest',
    notes: 'Notes',
    totalSets: 'TOTAL SETS FOR THE DAY',
    otherGroup: 'Other',
    fileName: 'Training Programs',
  },
} as const satisfies Record<
  ExportLocale,
  {
    exercise: string;
    sets: string;
    reps: string;
    rest: string;
    notes: string;
    totalSets: string;
    otherGroup: string;
    fileName: string;
  }
>;

/** Stable soft colors per catalog `category` (same key across sessions). */
export type ExportGroupTheme = { fillArgb: string; fontArgb: string };

export const EXPORT_CATEGORY_THEMES: Record<string, ExportGroupTheme> = {
  chest: { fillArgb: 'FFE2EFDA', fontArgb: 'FF548235' }, // green
  shoulders: { fillArgb: 'FFDDEBF7', fontArgb: 'FF2F5496' }, // blue
  'upper arms': { fillArgb: 'FFFCE4D6', fontArgb: 'FFC65911' }, // orange
  back: { fillArgb: 'FFD0ECE8', fontArgb: 'FF0E6655' }, // teal
  waist: { fillArgb: 'FFFADBD8', fontArgb: 'FF922B21' }, // red
  'upper legs': { fillArgb: 'FFE2D5F1', fontArgb: 'FF7030A0' }, // purple
  'lower legs': { fillArgb: 'FFD6EAF8', fontArgb: 'FF1A5276' }, // sky
  'lower arms': { fillArgb: 'FFFCF3CF', fontArgb: 'FF9A7D0A' }, // yellow
  neck: { fillArgb: 'FFEBDEF0', fontArgb: 'FF6C3483' }, // violet
  cardio: { fillArgb: 'FFD5F5E3', fontArgb: 'FF196F3D' }, // mint
};

export const EXPORT_DEFAULT_CATEGORY_THEME: ExportGroupTheme = {
  fillArgb: 'FFF2F3F4',
  fontArgb: 'FF566573',
};

export function exportCategoryTheme(
  categoryKey: string | undefined,
): ExportGroupTheme {
  if (!categoryKey || categoryKey === '__other__') {
    return EXPORT_DEFAULT_CATEGORY_THEME;
  }
  return EXPORT_CATEGORY_THEMES[categoryKey] ?? EXPORT_DEFAULT_CATEGORY_THEME;
}

/** Shared visual tokens for Excel + PDF exports (ARGB; PDF converts via helper). */
export const EXPORT_STYLE = {
  headerFillArgb: 'FF2E7D32',
  headerFontArgb: 'FFFFFFFF',
  sessionFillArgb: 'FFE8F5E9',
  totalFillArgb: 'FFE8F5E9',
  softBorderArgb: 'FFCCCCCC',
  lastCol: 5,
} as const;

/** Catalog `category` keys → Spanish labels (same keys as FE value-labels). */
const CATEGORY_LABELS_ES: Record<string, string> = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Cintura',
};

export function exportCategoryLabel(
  category: string | undefined,
  locale: ExportLocale,
  fallbackOther: string,
): string {
  const key = category?.trim().toLowerCase();
  if (!key) return fallbackOther;
  if (locale === 'es') {
    return (CATEGORY_LABELS_ES[key] ?? category!.trim()).toUpperCase();
  }
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}
