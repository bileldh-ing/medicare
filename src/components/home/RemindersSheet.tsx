import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { Appointment } from '@/features/appointments/bookingRules';
import { formatDateLabel, formatTimeRange } from '@/features/appointments/dateUtils';
import { getDoctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';

interface Props {
  visible: boolean;
  reminders: Appointment[];
  notificationsOn: boolean;
  onClose: () => void;
}

/** Reminders = upcoming appointments within 24 hours. */
export function RemindersSheet({ visible, reminders, notificationsOn, onClose }: Props) {
  const t = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Reminders">
      {!notificationsOn ? (
        <AppText color="secondary" style={styles.note}>
          Reminders are turned off in Settings.
        </AppText>
      ) : reminders.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell-off" size={28} color={t.colors.textMuted} />
          <AppText color="secondary" style={styles.note}>
            No appointments in the next 24 hours.
          </AppText>
        </View>
      ) : (
        reminders.map((a) => {
          const d = getDoctor(a.doctorId);
          if (!d) return null;
          const s = new Date(a.startISO);
          return (
            <View
              key={a.id}
              style={[styles.row, { backgroundColor: t.colors.blueTint, borderRadius: 20 }]}
            >
              <Avatar name={d.name} source={d.avatarImage} gradient={d.gradient} size={44} />
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{d.name}</AppText>
                <AppText variant="caption" color="secondary">
                  {formatDateLabel(s)} · {formatTimeRange(s, new Date(a.endISO))}
                </AppText>
              </View>
            </View>
          );
        })
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { marginTop: 8, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 },
});
