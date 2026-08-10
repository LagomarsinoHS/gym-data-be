import {
  exportCategoryLabel,
  type ExportLocale,
} from './training-program-export-headers';
import type { TrainingProgramExportItem } from './athlete-training-program-export.type';

export type TrainingProgramCategoryGroup = {
  key: string;
  label: string;
  items: TrainingProgramExportItem[];
};

/** Groups export items by catalog category, preserving first-seen order. */
export function groupTrainingProgramItemsByCategory(
  items: TrainingProgramExportItem[],
  locale: ExportLocale,
  otherLabel: string,
): TrainingProgramCategoryGroup[] {
  const groups: TrainingProgramCategoryGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const key = item.category?.trim().toLowerCase() || '__other__';
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByKey.set(key, index);
      groups.push({
        key,
        label: exportCategoryLabel(
          key === '__other__' ? undefined : item.category,
          locale,
          otherLabel,
        ),
        items: [],
      });
    }
    groups[index].items.push(item);
  }

  return groups;
}
