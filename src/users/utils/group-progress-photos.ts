import type { ProgressPhotoMonth } from '../schemas/user.schema';
import type { ProgressPhotosResponseDto } from '../dto/progress-photos-response.dto';
import type { ProgressPhotoPublicDto } from '../dto/upload-progress-photo-response.dto';

function toPublicPhoto(
  photo: ProgressPhotoMonth['front'],
): ProgressPhotoPublicDto | null {
  if (!photo) return null;
  return { url: photo.url, uploadedAt: photo.uploadedAt };
}

/**
 * Groups flat progressPhotos into years → months (newest year/month first).
 * Optional `year` keeps only that calendar year.
 */
export function groupProgressPhotos(
  progressPhotos: ProgressPhotoMonth[],
  year?: number,
): ProgressPhotosResponseDto {
  const filtered = year
    ? progressPhotos.filter((entry) => entry.yearMonth.startsWith(`${year}-`))
    : progressPhotos;

  const byYear = new Map<number, ProgressPhotosResponseDto['years'][number]>();

  for (const entry of filtered) {
    const [yearPart, monthPart] = entry.yearMonth.split('-');
    const yearNum = Number(yearPart);
    const monthNum = Number(monthPart);
    if (!yearNum || !monthNum) continue;

    let yearBucket = byYear.get(yearNum);
    if (!yearBucket) {
      yearBucket = { year: yearNum, months: [] };
      byYear.set(yearNum, yearBucket);
    }

    yearBucket.months.push({
      month: monthNum,
      yearMonth: entry.yearMonth,
      front: toPublicPhoto(entry.front),
      back: toPublicPhoto(entry.back),
    });
  }

  const years = [...byYear.values()]
    .map((yearBucket) => ({
      year: yearBucket.year,
      months: [...yearBucket.months].sort((a, b) => b.month - a.month),
    }))
    .sort((a, b) => b.year - a.year);

  return { years };
}
