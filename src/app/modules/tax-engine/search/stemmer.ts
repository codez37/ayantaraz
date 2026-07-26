import { normalizePersian } from './normalizer';

export function stem(text: string): string[] {
  const normalized = normalizePersian(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  const expanded = new Set<string>();

  for (const w of words) {
    expanded.add(w);
    if (w.startsWith('می')) expanded.add(w.slice(2));
    if (w.endsWith('های')) expanded.add(w.slice(0, -2));
    if (w.endsWith('ها')) expanded.add(w.slice(0, -2));
    if (w.endsWith('ان')) expanded.add(w.slice(0, -2));
    if (w.endsWith('ات')) expanded.add(w.slice(0, -2));
    if (w.endsWith('یدن')) expanded.add(w.slice(0, -3));
  }

  return [...expanded];
}
