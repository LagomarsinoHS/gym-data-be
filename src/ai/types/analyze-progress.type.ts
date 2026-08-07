export type AnalyzeProgressLocale = 'es' | 'en';

export type AnalyzeProgressMonthPhotos = {
  yearMonth: string;
  weightKg: number | null;
  /** Present photo URLs for the month (1 or 2). */
  photoUrls: string[];
};

export type AnalyzeProgressInput = {
  locale: AnalyzeProgressLocale;
  older: AnalyzeProgressMonthPhotos;
  newer: AnalyzeProgressMonthPhotos;
};

export type AnalyzeProgressParagraphBlock = {
  type: 'paragraph';
  text: string;
};

export type AnalyzeProgressSubtitleBlock = {
  type: 'subtitle';
  title: string;
  text: string;
};

export type AnalyzeProgressBlock = AnalyzeProgressParagraphBlock | AnalyzeProgressSubtitleBlock;

export type AnalyzeProgressSection = {
  title: string;
  blocks: AnalyzeProgressBlock[];
};

export type AnalyzeProgressResult = {
  sections: AnalyzeProgressSection[];
};
