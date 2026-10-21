import type { Doctor } from './doctors';

export interface SearchResult {
  doctor: Doctor;
  score: number;
  /** Which field matched best, for the result subtitle. */
  field: 'name' | 'specialty' | 'bio' | 'all';
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/** Lowercase + strip diacritics, keeping string length identical for index mapping. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokens(query: string): string[] {
  return normalize(query)
    .replace(/^dr\.?\s*/, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Filters by name, specialty and bio. Every query token must match somewhere;
 * name matches rank above specialty matches, which rank above bio matches.
 */
export function searchDoctors(doctors: Doctor[], query: string): SearchResult[] {
  const q = tokens(query);
  if (q.length === 0) {
    return doctors.map((doctor) => ({ doctor, score: 0, field: 'all' as const }));
  }
  const results: SearchResult[] = [];
  for (const doctor of doctors) {
    const name = normalize(doctor.name);
    const spec = normalize(doctor.specialty);
    const bio = normalize(doctor.bio);
    let score = 0;
    let best: SearchResult['field'] = 'bio';
    let bestWeight = 0;
    let allMatch = true;
    for (const t of q) {
      let w = 0;
      if (name.split(/\s+/).some((p) => p.startsWith(t))) w = 10;
      else if (name.includes(t)) w = 7;
      else if (spec.startsWith(t)) w = 6;
      else if (spec.includes(t)) w = 5;
      else if (bio.includes(t)) w = 2;
      if (w === 0) {
        allMatch = false;
        break;
      }
      score += w;
      if (w > bestWeight) {
        bestWeight = w;
        best = w >= 7 ? 'name' : w >= 5 ? 'specialty' : 'bio';
      }
    }
    if (allMatch) results.push({ doctor, score: score + doctor.rating / 10, field: best });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Splits `text` into highlighted / plain parts for every query token occurrence. */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = tokens(query);
  if (!text) return [];
  if (q.length === 0) return [{ text, match: false }];
  const n = normalize(text);
  const marks = new Array<boolean>(text.length).fill(false);
  for (const t of q) {
    let from = 0;
    while (from <= n.length - t.length) {
      const idx = n.indexOf(t, from);
      if (idx < 0) break;
      for (let i = idx; i < idx + t.length; i++) marks[i] = true;
      from = idx + t.length;
    }
  }
  const parts: HighlightPart[] = [];
  let buf = '';
  let cur = marks[0] ?? false;
  for (let i = 0; i < text.length; i++) {
    const m = marks[i] ?? false;
    if (m !== cur) {
      if (buf) parts.push({ text: buf, match: cur });
      buf = '';
      cur = m;
    }
    buf += text[i];
  }
  if (buf) parts.push({ text: buf, match: cur });
  return parts;
}

/** A short bio excerpt centred on the first match, for result rows. */
export function excerpt(text: string, query: string, radius = 48): string {
  const q = tokens(query)[0];
  if (!q) return text.slice(0, radius * 2);
  const idx = normalize(text).indexOf(q);
  if (idx < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}
