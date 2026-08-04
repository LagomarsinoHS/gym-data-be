/** Root Cloudinary folder for this product. */
export const CLOUDINARY_ROOT_FOLDER = 'gym-app';

/** Progress photos live under gym-app/progress/{userId}/{year}/{mon}. */
export const CLOUDINARY_PROGRESS_FOLDER = `${CLOUDINARY_ROOT_FOLDER}/progress`;

/** UTC month index 01–12 → 3-letter English folder name. */
const MONTH_FOLDER_BY_NUMBER: Record<string, string> = {
  '01': 'jan',
  '02': 'feb',
  '03': 'mar',
  '04': 'apr',
  '05': 'may',
  '06': 'jun',
  '07': 'jul',
  '08': 'aug',
  '09': 'sep',
  '10': 'oct',
  '11': 'nov',
  '12': 'dec',
};

/**
 * Folder for one athlete month: gym-app/progress/{userId}/{YYYY}/{mon}.
 * `yearMonth` must be `YYYY-MM`.
 */
export function progressPhotoFolder(userId: string, yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const monthFolder = MONTH_FOLDER_BY_NUMBER[month];
  if (!year || !monthFolder) {
    throw new Error(`Invalid yearMonth for progress folder: ${yearMonth}`);
  }
  return `${CLOUDINARY_PROGRESS_FOLDER}/${userId}/${year}/${monthFolder}`;
}
