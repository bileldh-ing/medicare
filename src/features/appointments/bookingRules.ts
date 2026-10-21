import { isBeforeDay } from './dateUtils';
import {
  DEFAULT_WORKING_HOURS,
  SLOT_MINUTES,
  isWorkingDay,
  slotMinutes,
  unavailableMinutes,
  type WorkingHours,
} from './slots';

export type AppointmentStatus = 'upcoming' | 'past' | 'cancelled';

export interface Appointment {
  id: string;
  doctorId: string;
  startISO: string;
  endISO: string;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingError =
  | 'MISSING_SELECTION'
  | 'PAST_TIME'
  | 'NOT_WORKING_DAY'
  | 'OUTSIDE_HOURS'
  | 'SLOT_UNAVAILABLE'
  | 'DOUBLE_BOOKING'
  | 'NOT_FOUND'
  | 'NOT_UPCOMING';

export const BOOKING_ERROR_MESSAGES: Record<BookingError, string> = {
  MISSING_SELECTION: 'Please choose a date and a time.',
  PAST_TIME: 'That time has already passed.',
  NOT_WORKING_DAY: 'The doctor is not available on this day.',
  OUTSIDE_HOURS: 'Please pick a time within working hours.',
  SLOT_UNAVAILABLE: 'This slot was just taken. Please choose another.',
  DOUBLE_BOOKING: 'You already have an appointment at this time.',
  NOT_FOUND: 'Appointment not found.',
  NOT_UPCOMING: 'Only upcoming appointments can be changed.',
};

export type Validation = { ok: true } | { ok: false; error: BookingError };

/** Past days are disabled in the date row. */
export function isDayDisabled(day: Date, now: Date): boolean {
  return isBeforeDay(day, now);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** A slot already booked by the user (with ANY doctor) blocks the same time. */
export function findConflict(
  appointments: Appointment[],
  start: Date,
  end: Date,
  excludeId?: string,
): Appointment | undefined {
  const s = start.getTime();
  const e = end.getTime();
  return appointments.find(
    (a) =>
      a.status === 'upcoming' &&
      a.id !== excludeId &&
      overlaps(s, e, new Date(a.startISO).getTime(), new Date(a.endISO).getTime()),
  );
}

export interface ValidateBookingInput {
  doctorId: string | null | undefined;
  start: Date | null | undefined;
  appointments: Appointment[];
  now: Date;
  hours?: WorkingHours;
  /** When rescheduling, the appointment being moved. */
  excludeId?: string;
}

export function validateBooking(input: ValidateBookingInput): Validation {
  const { doctorId, start, appointments, now } = input;
  const hours = input.hours ?? DEFAULT_WORKING_HOURS;
  if (!doctorId || !start || Number.isNaN(start.getTime())) {
    return { ok: false, error: 'MISSING_SELECTION' };
  }
  if (start.getTime() <= now.getTime()) return { ok: false, error: 'PAST_TIME' };
  if (!isWorkingDay(start, hours)) return { ok: false, error: 'NOT_WORKING_DAY' };
  const minutes = start.getHours() * 60 + start.getMinutes();
  if (!slotMinutes(hours).includes(minutes) || start.getSeconds() !== 0) {
    return { ok: false, error: 'OUTSIDE_HOURS' };
  }
  const excluded = input.excludeId ? appointments.find((a) => a.id === input.excludeId) : undefined;
  const keepingSameSlot =
    excluded?.doctorId === doctorId && new Date(excluded.startISO).getTime() === start.getTime();
  if (!keepingSameSlot && unavailableMinutes(doctorId, start, hours).has(minutes)) {
    return { ok: false, error: 'SLOT_UNAVAILABLE' };
  }
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
  if (findConflict(appointments, start, end, input.excludeId)) {
    return { ok: false, error: 'DOUBLE_BOOKING' };
  }
  return { ok: true };
}

/** Appointments whose end time has passed automatically move to 'past'. */
export function autoMarkPast(appointments: Appointment[], now: Date): Appointment[] {
  let changed = false;
  const next = appointments.map((a) => {
    if (a.status === 'upcoming' && new Date(a.endISO).getTime() <= now.getTime()) {
      changed = true;
      return { ...a, status: 'past' as const, updatedAt: now.toISOString() };
    }
    return a;
  });
  return changed ? next : appointments;
}

export function byStartAsc(a: Appointment, b: Appointment) {
  return new Date(a.startISO).getTime() - new Date(b.startISO).getTime();
}

export function upcomingSorted(appointments: Appointment[], now: Date): Appointment[] {
  return appointments
    .filter((a) => a.status === 'upcoming' && new Date(a.endISO).getTime() > now.getTime())
    .sort(byStartAsc);
}

/** Home card: the soonest upcoming appointment. */
export function nextUpcoming(appointments: Appointment[], now: Date): Appointment | undefined {
  return upcomingSorted(appointments, now)[0];
}

export function filterByStatus(appointments: Appointment[], status: AppointmentStatus) {
  const list = appointments.filter((a) => a.status === status);
  return status === 'upcoming' ? list.sort(byStartAsc) : list.sort((a, b) => byStartAsc(b, a));
}

/** Start times (ms) of the user's upcoming appointments, for slot disabling. */
export function bookedStartTimes(appointments: Appointment[], excludeId?: string): number[] {
  return appointments
    .filter((a) => a.status === 'upcoming' && a.id !== excludeId)
    .map((a) => new Date(a.startISO).getTime());
}

/** Reminders = upcoming appointments starting within the next 24 hours. */
export function dueReminders(appointments: Appointment[], now: Date): Appointment[] {
  const limit = now.getTime() + 24 * 60 * 60 * 1000;
  return upcomingSorted(appointments, now).filter((a) => new Date(a.startISO).getTime() <= limit);
}
