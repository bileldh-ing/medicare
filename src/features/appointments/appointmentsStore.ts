import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';
import { registerScopedStore } from '@/features/session/scopedStores';
import { createUserScopedStorage } from '@/utils/storage';

import { autoMarkPast, validateBooking, type Appointment, type BookingError } from './bookingRules';
import { SLOT_MINUTES, type WorkingHours } from './slots';

interface AppointmentsData {
  appointments: Appointment[];
  /** Reminder ids the user has already seen (drives the bell's green dot). */
  seenReminderIds: string[];
}

export type BookingResult =
  { ok: true; appointment: Appointment } | { ok: false; error: BookingError };

interface AppointmentsState extends AppointmentsData {
  hasHydrated: boolean;
  book: (input: {
    doctorId: string;
    start: Date;
    notes: string;
    hours?: WorkingHours;
    now?: Date;
  }) => BookingResult;
  reschedule: (input: {
    id: string;
    start: Date;
    notes?: string;
    hours?: WorkingHours;
    now?: Date;
  }) => BookingResult;
  cancel: (id: string) => boolean;
  refreshStatuses: (now?: Date) => void;
  markRemindersSeen: (ids: string[]) => void;
}

const EMPTY: AppointmentsData = { appointments: [], seenReminderIds: [] };
const VERSION = 1;

function newId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Defensive migration: drops malformed rows instead of crashing on old/corrupted data. */
export function migrateAppointments(persisted: unknown): AppointmentsData {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<
    string,
    unknown
  >;
  const list = Array.isArray(p.appointments) ? p.appointments : [];
  const appointments = list.filter(
    (a): a is Appointment =>
      !!a &&
      typeof a === 'object' &&
      typeof (a as Appointment).id === 'string' &&
      typeof (a as Appointment).doctorId === 'string' &&
      typeof (a as Appointment).startISO === 'string' &&
      typeof (a as Appointment).endISO === 'string',
  );
  const seen = Array.isArray(p.seenReminderIds)
    ? p.seenReminderIds.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    appointments: appointments.map((a) => ({
      ...a,
      status: a.status ?? 'upcoming',
      notes: a.notes ?? '',
      createdAt: a.createdAt ?? a.startISO,
      updatedAt: a.updatedAt ?? a.startISO,
    })),
    seenReminderIds: seen,
  };
}

export const useAppointmentsStore = create<AppointmentsState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hasHydrated: false,

      book: ({ doctorId, start, notes, hours, now = new Date() }) => {
        const appointments = autoMarkPast(get().appointments, now);
        const v = validateBooking({ doctorId, start, appointments, now, hours });
        if (!v.ok) return v;
        const iso = now.toISOString();
        const appointment: Appointment = {
          id: newId(),
          doctorId,
          startISO: start.toISOString(),
          endISO: new Date(start.getTime() + SLOT_MINUTES * 60000).toISOString(),
          status: 'upcoming',
          notes: notes.trim(),
          createdAt: iso,
          updatedAt: iso,
        };
        set({ appointments: [...appointments, appointment] });
        return { ok: true, appointment };
      },

      reschedule: ({ id, start, notes, hours, now = new Date() }) => {
        const appointments = autoMarkPast(get().appointments, now);
        const current = appointments.find((a) => a.id === id);
        if (!current) return { ok: false, error: 'NOT_FOUND' };
        if (current.status !== 'upcoming') return { ok: false, error: 'NOT_UPCOMING' };
        const v = validateBooking({
          doctorId: current.doctorId,
          start,
          appointments,
          now,
          hours,
          excludeId: id,
        });
        if (!v.ok) return v;
        const updated: Appointment = {
          ...current,
          startISO: start.toISOString(),
          endISO: new Date(start.getTime() + SLOT_MINUTES * 60000).toISOString(),
          notes: notes !== undefined ? notes.trim() : current.notes,
          updatedAt: now.toISOString(),
        };
        set({ appointments: appointments.map((a) => (a.id === id ? updated : a)) });
        return { ok: true, appointment: updated };
      },

      cancel: (id) => {
        const target = get().appointments.find((a) => a.id === id);
        if (!target || target.status !== 'upcoming') return false;
        const iso = new Date().toISOString();
        set({
          appointments: get().appointments.map((a) =>
            a.id === id ? { ...a, status: 'cancelled', updatedAt: iso } : a,
          ),
        });
        return true;
      },

      refreshStatuses: (now = new Date()) => {
        const current = get().appointments;
        const next = autoMarkPast(current, now);
        if (next !== current) set({ appointments: next });
      },

      markRemindersSeen: (ids) => {
        const seen = new Set(get().seenReminderIds);
        let changed = false;
        ids.forEach((id) => {
          if (!seen.has(id)) {
            seen.add(id);
            changed = true;
          }
        });
        if (changed) set({ seenReminderIds: [...seen].slice(-100) });
      },
    }),
    {
      name: STORAGE_KEYS.appointments,
      version: VERSION,
      storage: createUserScopedStorage<AppointmentsData>(),
      skipHydration: true,
      partialize: (s): AppointmentsData => ({
        appointments: s.appointments,
        seenReminderIds: s.seenReminderIds,
      }),
      migrate: (persisted) => migrateAppointments(persisted),
      merge: (persisted, current) => ({ ...current, ...migrateAppointments(persisted) }),
      onRehydrateStorage: () => (state) => {
        useAppointmentsStore.setState({ hasHydrated: true });
        state?.refreshStatuses();
      },
    },
  ),
);

registerScopedStore({
  name: 'appointments',
  reset: () => useAppointmentsStore.setState({ ...EMPTY, hasHydrated: false }),
  rehydrate: () => useAppointmentsStore.persist.rehydrate(),
});
