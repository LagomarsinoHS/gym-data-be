/** Title Case without accents, for food preference / restriction tags. */
export function normalizeFoodTag(value: string): string {
  const stripped = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  if (!stripped) return '';
  return stripped.replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
}

export function normalizeFoodTags(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values ?? []) {
    const tag = normalizeFoodTag(String(raw ?? ''));
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
