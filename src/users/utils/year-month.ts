/** Calendar month key YYYY-MM in UTC (day/hour ignored for product). */
export function currentYearMonth(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('Unable to format yearMonth from date');
  }

  return `${year}-${month}`;
}
