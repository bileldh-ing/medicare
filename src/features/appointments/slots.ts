import { addMinutes, dateKey, formatSlotLabel, isBeforeDay, startOfDay } from './dateUtils';

export const SLOT_MINUTES = 30;
export const SLOTS_PER_PAGE = 9;

export interface WorkingHours {
  /** Days of week the doctor works (0 = Sunday). */
  days: number[];
  /** Minutes from midnight. */
  start: number;
  end: number;
  lunchStart: number;
  lunchEnd: number;
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  days: [0, 1, 2, 3, 4, 5, 6],
  start: 8 * 60,
  end: 17 * 60,
  lunchStart: 13 * 60,
  lunchEnd: 14 * 60,
};

export type SlotStatus = 'available' | 'unavailable' | 'booked' | 'past';

export interface Slot {
  /** Stable id: `${doctorId}|${dateKey}|${minutes}` */
  id: string;
  start: Date;
  end: Date;
  minutes: number;
  label: string;
  status: SlotStatus;
}

/** FNV-1a 32-bit string hash. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: tiny deterministic PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Slot start times (minutes from midnight) for a working day, lunch excluded. */
export function slotMinutes(hours: WorkingHours = DEFAULT_WORKING_HOURS): number[] {
  const out: number[] = [];
  for (let m = hours.start; m + SLOT_MINUTES <= hours.end; m += SLOT_MINUTES) {
    const overlapsLunch = m < hours.lunchEnd && m + SLOT_MINUTES > hours.lunchStart;
    if (!overlapsLunch) out.push(m);
  }
  return out;
}

/**
 * Deterministic "already taken by other patients" set, seeded by doctorId + date,
 * so the grid looks realistic and never changes between renders.
 */
export function unavailableMinutes(
  doctorId: string,
  day: Date,
  hours: WorkingHours = DEFAULT_WORKING_HOURS,
  ratio = 0.28,
): Set<number> {
  const rand = mulberry32(hashString(`${doctorId}|${dateKey(day)}`));
  const set = new Set<number>();
  for (const m of slotMinutes(hours)) {
    if (rand() < ratio) set.add(m);
  }
  return set;
}

export interface GenerateSlotsOptions {
  now: Date;
  /** Start times (ms) already booked by the current user with ANY doctor. */
  bookedStartTimes?: Iterable<number>;
  /** Start time (ms) of the appointment being rescheduled: stays selectable. */
  allowStartTime?: number;
  hours?: WorkingHours;
}

export function isWorkingDay(day: Date, hours: WorkingHours = DEFAULT_WORKING_HOURS): boolean {
  return hours.days.includes(day.getDay());
}

/** All slots of a day with their status. Pure and deterministic. */
export function generateSlots(doctorId: string, day: Date, opts: GenerateSlotsOptions): Slot[] {
  const hours = opts.hours ?? DEFAULT_WORKING_HOURS;
  if (!isWorkingDay(day, hours)) return [];
  const base = startOfDay(day);
  const unavailable = unavailableMinutes(doctorId, base, hours);
  const booked = new Set(opts.bookedStartTimes ?? []);
  const dayIsPast = isBeforeDay(base, opts.now);
  const key = dateKey(base);

  return slotMinutes(hours).map((m) => {
    const start = addMinutes(base, m);
    const end = addMinutes(start, SLOT_MINUTES);
    const t = start.getTime();
    let status: SlotStatus = 'available';
    if (dayIsPast || t <= opts.now.getTime()) status = 'past';
    else if (t === opts.allowStartTime) status = 'available';
    else if (booked.has(t)) status = 'booked';
    else if (unavailable.has(m)) status = 'unavailable';
    return {
      id: `${doctorId}|${key}|${m}`,
      start,
      end,
      minutes: m,
      label: formatSlotLabel(start),
      status,
    };
  });
}

export function countAvailable(slots: Slot[]): number {
  return slots.reduce((n, s) => n + (s.status === 'available' ? 1 : 0), 0);
}

export function pageCount(total: number, perPage = SLOTS_PER_PAGE): number {
  return Math.max(1, Math.ceil(total / perPage));
}

export function paginate<T>(items: T[], page: number, perPage = SLOTS_PER_PAGE): T[] {
  const p = Math.min(Math.max(0, page), pageCount(items.length, perPage) - 1);
  return items.slice(p * perPage, p * perPage + perPage);
}

/** The page on which a given slot lives (used to show a preselected reschedule slot). */
export function pageOf<T>(items: T[], predicate: (t: T) => boolean, perPage = SLOTS_PER_PAGE) {
  const idx = items.findIndex(predicate);
  return idx < 0 ? 0 : Math.floor(idx / perPage);
}
