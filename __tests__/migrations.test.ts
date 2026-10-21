import { migrateAppointments } from '@/features/appointments/appointmentsStore';
import { DEFAULT_SETTINGS, migrateSettings } from '@/features/settings/settingsStore';
import { safeParse } from '@/utils/storage';

describe('persisted-state migrations', () => {
  it('migrates v1 settings (hapticsEnabled) to v2 with defaults', () => {
    expect(migrateSettings({ hapticsEnabled: false, onboardingSeen: true }, 1)).toEqual({
      ...DEFAULT_SETTINGS,
      haptics: false,
      onboardingSeen: true,
    });
  });

  it('falls back to defaults for garbage settings', () => {
    expect(migrateSettings(null, 1)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings('nope', 2)).toEqual(DEFAULT_SETTINGS);
  });

  it('drops malformed appointments and fills missing fields', () => {
    const out = migrateAppointments({
      appointments: [
        {
          id: 'a',
          doctorId: 'd1',
          startISO: '2025-11-25T08:00:00.000Z',
          endISO: '2025-11-25T08:30:00.000Z',
        },
        { id: 42 },
        null,
      ],
      seenReminderIds: ['a', 7],
    });
    expect(out.appointments).toHaveLength(1);
    expect(out.appointments[0]).toMatchObject({ id: 'a', status: 'upcoming', notes: '' });
    expect(out.seenReminderIds).toEqual(['a']);
    expect(migrateAppointments(undefined)).toEqual({ appointments: [], seenReminderIds: [] });
  });

  it('safeParse never throws on corrupted JSON', () => {
    expect(safeParse('{oops', { ok: true })).toEqual({ ok: true });
    expect(safeParse(null, 1)).toBe(1);
    expect(safeParse('[1,2]', [])).toEqual([1, 2]);
  });
});
