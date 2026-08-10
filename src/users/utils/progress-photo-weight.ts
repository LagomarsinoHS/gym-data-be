import type { ProgressPhotoMonth } from '../schemas/user.schema';

/**
 * Latest weight across progress months (newest yearMonth first).
 * Source of truth for User.currentWeightKg.
 */
export function recomputeCurrentWeightKg(
  progressPhotos: ProgressPhotoMonth[],
): number | null {
  const sorted = [...(progressPhotos ?? [])].sort((a, b) =>
    b.yearMonth.localeCompare(a.yearMonth),
  );

  for (const entry of sorted) {
    const weight = entry.weightKg;
    if (typeof weight === 'number' && Number.isFinite(weight)) {
      return weight;
    }
  }

  return null;
}

export function cloneProgressPhotoMonths(
  progressPhotos: ProgressPhotoMonth[],
): ProgressPhotoMonth[] {
  return (progressPhotos ?? []).map((entry) => ({
    yearMonth: entry.yearMonth,
    weightKg: entry.weightKg ?? null,
    front: entry.front ?? null,
    back: entry.back ?? null,
  }));
}
