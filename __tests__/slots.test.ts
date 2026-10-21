import {
  formatDateLabel,
  formatMonthLabel,
  formatSlotLabel,
  formatTimeRange,
  greetingFor,
  weekDays,
} from '@/features/appointments/dateUtils';
import {
  DEFAULT_WORKING_HOURS,
  SLOTS_PER_PAGE,
  countAvailable,
  generateSlots,
  hashString,
  mulberry32,
  pageCount,
  pageOf,
  paginate,
  slotMinutes,
  unavailableMinutes,
} from '@/features/appointments/slots';

// Monday 24 Nov 2025, 09:00 local time
const NOW = new Date(2025, 10, 24, 9, 0);
const TOMORROW = new Date(2025, 10, 25);

describe('slot generation', () => {
  it('creates 30-minute slots from 8:00 to 17:00 without the 13:00-14:00 lunch break', () => {
    const mins = slotMinutes();
    expect(mins[0]).toBe(8 * 60);
    expect(mins[mins.length - 1]).toBe(16 * 60 + 30);
    expect(mins).toHaveLength(16);
    expect(mins).not.toContain(13 * 60);
    expect(mins).not.toContain(13 * 60 + 30);
    expect(mins).toContain(14 * 60);
    mins.slice(1).forEach((m, i) => {
      if (m !== 14 * 60) expect(m - mins[i]!).toBe(30);
    });
  });

  it('slot ends are 30 minutes after starts and labels are formatted', () => {
    const slots = generateSlots('d1', TOMORROW, { now: NOW });
    expect(slots[0]!.label).toBe('8:00 AM');
    expect(slots.find((s) => s.minutes === 14 * 60)!.label).toBe('2:00 PM');
    slots.forEach((s) => expect(s.end.getTime() - s.start.getTime()).toBe(30 * 60 * 1000));
  });

  it('is deterministic for the same doctor and date', () => {
    const a = generateSlots('d1', TOMORROW, { now: NOW }).map((s) => s.status);
    const b = generateSlots('d1', TOMORROW, { now: NOW }).map((s) => s.status);
    expect(a).toEqual(b);
    expect([...unavailableMinutes('d3', TOMORROW)]).toEqual([
      ...unavailableMinutes('d3', TOMORROW),
    ]);
  });

  it('seeds unavailability per doctor and per date', () => {
    const days = Array.from({ length: 10 }, (_, i) => new Date(2025, 10, 25 + i));
    const sig = (id: string) => days.map((d) => [...unavailableMinutes(id, d)].join(',')).join('|');
    expect(sig('d1')).not.toBe(sig('d2'));
    const perDay = days.map((d) => [...unavailableMinutes('d1', d)].join(','));
    expect(new Set(perDay).size).toBeGreaterThan(1);
  });

  it('marks some, but not all, slots unavailable on average', () => {
    let unavailable = 0;
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const s = generateSlots('d4', new Date(2025, 11, 1 + i), { now: NOW });
      total += s.length;
      unavailable += s.filter((x) => x.status === 'unavailable').length;
    }
    const ratio = unavailable / total;
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.5);
  });

  it('disables past times today and every slot on past days', () => {
    const today = generateSlots('d1', NOW, { now: NOW });
    today.forEach((s) => {
      if (s.start.getTime() <= NOW.getTime()) expect(s.status).toBe('past');
      else expect(s.status).not.toBe('past');
    });
    const yesterday = generateSlots('d1', new Date(2025, 10, 23), { now: NOW });
    expect(yesterday.every((s) => s.status === 'past')).toBe(true);
  });

  it('disables slots the user already booked (with any doctor)', () => {
    const slots = generateSlots('d2', TOMORROW, { now: NOW });
    const target = slots.find((s) => s.status === 'available')!;
    const again = generateSlots('d2', TOMORROW, {
      now: NOW,
      bookedStartTimes: [target.start.getTime()],
    });
    expect(again.find((s) => s.id === target.id)!.status).toBe('booked');
  });

  it('keeps the slot being rescheduled selectable', () => {
    const slots = generateSlots('d2', TOMORROW, { now: NOW });
    const target = slots.find((s) => s.status === 'available')!;
    const t = target.start.getTime();
    const again = generateSlots('d2', TOMORROW, {
      now: NOW,
      bookedStartTimes: [t],
      allowStartTime: t,
    });
    expect(again.find((s) => s.id === target.id)!.status).toBe('available');
  });

  it('returns no slots on a non-working day', () => {
    const hours = { ...DEFAULT_WORKING_HOURS, days: [1, 2, 3, 4, 5] };
    const sunday = new Date(2025, 10, 30);
    expect(generateSlots('d1', sunday, { now: NOW, hours })).toEqual([]);
  });

  it('counts available slots', () => {
    const slots = generateSlots('d1', TOMORROW, { now: NOW });
    expect(countAvailable(slots)).toBe(slots.filter((s) => s.status === 'available').length);
  });

  it('prng helpers are stable', () => {
    expect(hashString('d1|2025-11-25')).toBe(hashString('d1|2025-11-25'));
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});

describe('pagination (> 9 slots)', () => {
  const items = Array.from({ length: 16 }, (_, i) => i);
  it('splits into pages of 9', () => {
    expect(SLOTS_PER_PAGE).toBe(9);
    expect(pageCount(16)).toBe(2);
    expect(pageCount(9)).toBe(1);
    expect(pageCount(0)).toBe(1);
    expect(paginate(items, 0)).toHaveLength(9);
    expect(paginate(items, 1)).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(paginate(items, 99)).toEqual(paginate(items, 1)); // clamped
  });
  it('finds the page of an item', () => {
    expect(pageOf(items, (x) => x === 12)).toBe(1);
    expect(pageOf(items, (x) => x === 3)).toBe(0);
    expect(pageOf(items, () => false)).toBe(0);
  });
});

describe('date formats', () => {
  it('formats like the reference', () => {
    expect(formatDateLabel(new Date(2025, 10, 18))).toBe('18 Nov, Tuesday');
    expect(formatTimeRange(new Date(2025, 10, 18, 20, 0), new Date(2025, 10, 18, 20, 30))).toBe(
      '8pm - 8:30 pm',
    );
    expect(formatSlotLabel(new Date(2025, 10, 18, 9, 30))).toBe('9:30 AM');
    expect(formatSlotLabel(new Date(2025, 10, 18, 12, 0))).toBe('12:00 PM');
    expect(formatMonthLabel(new Date(2025, 10, 1))).toBe('November 2025');
  });
  it('builds a Sun..Sat week around a date', () => {
    const w = weekDays(new Date(2025, 10, 26));
    expect(w.map((d) => d.getDate())).toEqual([23, 24, 25, 26, 27, 28, 29]);
    expect(w[0]!.getDay()).toBe(0);
  });
  it('greets by time of day', () => {
    expect(greetingFor(new Date(2025, 0, 1, 8))).toBe('Good morning!');
    expect(greetingFor(new Date(2025, 0, 1, 14))).toBe('Good afternoon!');
    expect(greetingFor(new Date(2025, 0, 1, 20))).toBe('Good evening!');
  });
});
