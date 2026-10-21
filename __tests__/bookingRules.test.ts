import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';
import {
  autoMarkPast,
  bookedStartTimes,
  dueReminders,
  filterByStatus,
  findConflict,
  isDayDisabled,
  nextUpcoming,
  validateBooking,
  type Appointment,
} from '@/features/appointments/bookingRules';
import {
  DEFAULT_WORKING_HOURS,
  generateSlots,
  unavailableMinutes,
} from '@/features/appointments/slots';
import { searchDoctors, highlightParts } from '@/features/doctors/search';
import { DOCTORS } from '@/features/doctors/doctors';

const NOW = new Date(2025, 10, 24, 9, 0); // Mon 24 Nov 2025 09:00

function freeSlot(doctorId: string, day: Date, skip = 0): Date {
  const s = generateSlots(doctorId, day, { now: NOW }).filter((x) => x.status === 'available');
  const slot = s[skip];
  if (!slot) throw new Error('no free slot in fixture');
  return slot.start;
}

function appt(partial: Partial<Appointment> & { start: Date; doctorId?: string }): Appointment {
  const end = new Date(partial.start.getTime() + 30 * 60000);
  return {
    id: partial.id ?? `a_${partial.start.getTime()}`,
    doctorId: partial.doctorId ?? 'd1',
    startISO: partial.start.toISOString(),
    endISO: end.toISOString(),
    status: partial.status ?? 'upcoming',
    notes: '',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

const TOMORROW = new Date(2025, 10, 25);

describe('validateBooking', () => {
  it('requires a date and time', () => {
    expect(validateBooking({ doctorId: 'd1', start: null, appointments: [], now: NOW })).toEqual({
      ok: false,
      error: 'MISSING_SELECTION',
    });
  });

  it('rejects past times and past days', () => {
    expect(isDayDisabled(new Date(2025, 10, 23), NOW)).toBe(true);
    expect(isDayDisabled(NOW, NOW)).toBe(false);
    const r = validateBooking({
      doctorId: 'd1',
      start: new Date(2025, 10, 24, 8, 30),
      appointments: [],
      now: NOW,
    });
    expect(r).toEqual({ ok: false, error: 'PAST_TIME' });
  });

  it('rejects times outside working hours or during lunch', () => {
    const lunch = new Date(2025, 10, 25, 13, 0);
    expect(validateBooking({ doctorId: 'd1', start: lunch, appointments: [], now: NOW })).toEqual({
      ok: false,
      error: 'OUTSIDE_HOURS',
    });
    const evening = new Date(2025, 10, 25, 18, 0);
    expect(validateBooking({ doctorId: 'd1', start: evening, appointments: [], now: NOW }).ok).toBe(
      false,
    );
    const odd = new Date(2025, 10, 25, 9, 15);
    expect(validateBooking({ doctorId: 'd1', start: odd, appointments: [], now: NOW }).ok).toBe(
      false,
    );
  });

  it('rejects non-working days', () => {
    const hours = { ...DEFAULT_WORKING_HOURS, days: [1, 2, 3, 4, 5] };
    const sat = new Date(2025, 10, 29, 9, 0);
    expect(
      validateBooking({ doctorId: 'd1', start: sat, appointments: [], now: NOW, hours }),
    ).toEqual({
      ok: false,
      error: 'NOT_WORKING_DAY',
    });
  });

  it('rejects seeded-unavailable slots', () => {
    const minutes = [...unavailableMinutes('d1', TOMORROW)][0]!;
    const start = new Date(2025, 10, 25, Math.floor(minutes / 60), minutes % 60);
    expect(validateBooking({ doctorId: 'd1', start, appointments: [], now: NOW })).toEqual({
      ok: false,
      error: 'SLOT_UNAVAILABLE',
    });
  });

  it('prevents double booking at the same time with ANY doctor', () => {
    const start = freeSlot('d1', TOMORROW);
    const existing = [appt({ start, doctorId: 'd1' })];
    // find another doctor free at that exact time
    const other = DOCTORS.find(
      (d) =>
        d.id !== 'd1' &&
        !unavailableMinutes(d.id, TOMORROW).has(start.getHours() * 60 + start.getMinutes()),
    )!;
    expect(
      validateBooking({ doctorId: other.id, start, appointments: existing, now: NOW }),
    ).toEqual({
      ok: false,
      error: 'DOUBLE_BOOKING',
    });
    expect(findConflict(existing, start, new Date(start.getTime() + 30 * 60000))).toBeDefined();
  });

  it('cancelled and past appointments do not block a slot', () => {
    const start = freeSlot('d1', TOMORROW);
    const list = [appt({ start, status: 'cancelled' })];
    expect(validateBooking({ doctorId: 'd1', start, appointments: list, now: NOW })).toEqual({
      ok: true,
    });
  });

  it('ignores the appointment being rescheduled', () => {
    const start = freeSlot('d1', TOMORROW);
    const a = appt({ id: 'x', start });
    expect(
      validateBooking({ doctorId: 'd1', start, appointments: [a], now: NOW, excludeId: 'x' }),
    ).toEqual({
      ok: true,
    });
  });
});

describe('statuses and selectors', () => {
  it('moves ended upcoming appointments to past automatically', () => {
    const ended = appt({ id: 'old', start: new Date(2025, 10, 24, 8, 0) });
    const future = appt({ id: 'new', start: new Date(2025, 10, 25, 10, 0) });
    const cancelled = appt({ id: 'c', start: new Date(2025, 10, 20, 10, 0), status: 'cancelled' });
    const next = autoMarkPast([ended, future, cancelled], NOW);
    expect(next.find((a) => a.id === 'old')!.status).toBe('past');
    expect(next.find((a) => a.id === 'new')!.status).toBe('upcoming');
    expect(next.find((a) => a.id === 'c')!.status).toBe('cancelled');
    // unchanged input returns the same reference (no needless store writes)
    expect(autoMarkPast([future], NOW)).toEqual([future]);
    const same = [future];
    expect(autoMarkPast(same, NOW)).toBe(same);
  });

  it('nextUpcoming returns the soonest', () => {
    const a = appt({ id: 'a', start: new Date(2025, 10, 27, 10, 0) });
    const b = appt({ id: 'b', start: new Date(2025, 10, 25, 9, 0) });
    expect(nextUpcoming([a, b], NOW)!.id).toBe('b');
    expect(filterByStatus([a, b], 'upcoming').map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('bookedStartTimes and reminders', () => {
    const soon = appt({ id: 's', start: new Date(2025, 10, 24, 15, 0) });
    const later = appt({ id: 'l', start: new Date(2025, 10, 28, 15, 0) });
    expect(bookedStartTimes([soon, later], 's')).toEqual(
      [later.startISO].map((x) => new Date(x).getTime()),
    );
    expect(dueReminders([soon, later], NOW).map((x) => x.id)).toEqual(['s']);
  });
});

describe('appointments store', () => {
  beforeEach(() => useAppointmentsStore.setState({ appointments: [], seenReminderIds: [] }));

  it('books, reschedules (same record) and cancels', () => {
    const store = useAppointmentsStore.getState();
    const start = freeSlot('d1', TOMORROW);
    const r = store.book({ doctorId: 'd1', start, notes: '  chest pain  ', now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.appointment.notes).toBe('chest pain');
    expect(r.appointment.status).toBe('upcoming');

    // same slot again → double booking
    const dup = useAppointmentsStore
      .getState()
      .book({ doctorId: 'd1', start, notes: '', now: NOW });
    expect(dup).toEqual({ ok: false, error: 'DOUBLE_BOOKING' });

    const newStart = freeSlot('d1', TOMORROW, 2);
    const moved = useAppointmentsStore
      .getState()
      .reschedule({ id: r.appointment.id, start: newStart, now: NOW });
    expect(moved.ok).toBe(true);
    const list = useAppointmentsStore.getState().appointments;
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(r.appointment.id);
    expect(new Date(list[0]!.startISO).getTime()).toBe(newStart.getTime());

    expect(useAppointmentsStore.getState().cancel(r.appointment.id)).toBe(true);
    expect(useAppointmentsStore.getState().appointments[0]!.status).toBe('cancelled');
    // cannot reschedule a cancelled appointment
    expect(
      useAppointmentsStore.getState().reschedule({ id: r.appointment.id, start, now: NOW }),
    ).toEqual({
      ok: false,
      error: 'NOT_UPCOMING',
    });
  });
});

describe('search', () => {
  it('matches name, specialty and bio and ranks name first', () => {
    expect(searchDoctors(DOCTORS, 'ali')[0]!.doctor.name).toBe('Dr. Ali Khan');
    const cardio = searchDoctors(DOCTORS, 'cardio').map((r) => r.doctor.specialty);
    expect(cardio.length).toBeGreaterThan(0);
    expect(new Set(cardio)).toEqual(new Set(['Cardiology']));
    expect(searchDoctors(DOCTORS, 'migraine').map((r) => r.doctor.id)).toContain('d3');
    expect(searchDoctors(DOCTORS, 'zzzz')).toHaveLength(0);
    expect(searchDoctors(DOCTORS, '')).toHaveLength(DOCTORS.length);
  });
  it('highlights matches case-insensitively', () => {
    expect(highlightParts('Dr. Ali Khan', 'ali')).toEqual([
      { text: 'Dr. ', match: false },
      { text: 'Ali', match: true },
      { text: ' Khan', match: false },
    ]);
  });
});
