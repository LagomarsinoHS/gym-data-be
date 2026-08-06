export type AnalyzeProgressLocale = 'es' | 'en';

export type AnalyzeProgressMonthPhotos = {
  yearMonth: string;
  weightKg: number | null;
  frontUrl?: string;
  backUrl?: string;
};

export type AnalyzeProgressInput = {
  locale: AnalyzeProgressLocale;
  older: AnalyzeProgressMonthPhotos;
  newer: AnalyzeProgressMonthPhotos;
};

export type AnalyzeProgressResult = {
  analysis: string;
};
