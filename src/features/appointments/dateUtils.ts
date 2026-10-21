/** Pure, timezone-local date helpers (no external date library). */

export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;

const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MINUTE);
}

/** Week starts on Sunday (matches the Sun..Sat day row). */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -s.getDay());
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Same day-of-month in another month, clamped (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

/** Local calendar key, e.g. 2025-11-24. */
export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "18 Nov, Monday" */
export function formatDateLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${WEEKDAYS_LONG[d.getDay()]}`;
}

function hour12(d: Date) {
  const h = d.getHours() % 12;
  return { h: h === 0 ? 12 : h, m: d.getMinutes(), ap: d.getHours() < 12 ? 'am' : 'pm' };
}

/** "8pm - 8:30 pm" (reference format: compact start, spaced end). */
export function formatTimeRange(start: Date, end: Date): string {
  const s = hour12(start);
  const e = hour12(end);
  const sm = s.m ? `:${String(s.m).padStart(2, '0')}` : '';
  const em = e.m ? `:${String(e.m).padStart(2, '0')}` : '';
  return `${s.h}${sm}${s.ap} - ${e.h}${em} ${e.ap}`;
}

/** "9:30 AM" */
export function formatSlotLabel(d: Date): string {
  const t = hour12(d);
  return `${t.h}:${String(t.m).padStart(2, '0')} ${t.ap.toUpperCase()}`;
}

/** "November 2025": localized when Intl is available, English fallback otherwise. */
export function formatMonthLabel(d: Date, locale?: string): string {
  try {
    if (typeof Intl !== 'undefined' && locale) {
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
    }
  } catch {
    // fall through
  }
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Good morning!" / afternoon / evening */
export function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

export function formatRelativeShort(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (isSameDay(d, now)) return formatSlotLabel(d);
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return WEEKDAYS_SHORT[d.getDay()] ?? '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
