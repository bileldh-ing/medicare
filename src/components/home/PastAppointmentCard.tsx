import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Appointment } from '@/features/appointments/bookingRules';
import { formatDateLabel, formatTimeRange } from '@/features/appointments/dateUtils';
import type { Doctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';

interface Props {
  appointment: Appointment;
  doctor: Doctor;
  onBookAgain: () => void;
}

/** White card for past / cancelled appointments. */
export const PastAppointmentCard = memo(function PastAppointmentCard({
  appointment,
  doctor,
  onBookAgain,
}: Props) {
  const t = useTheme();
  const s = new Date(appointment.startISO);
  const cancelled = appointment.status === 'cancelled';
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.colors.surface, borderRadius: t.radii.card },
        t.shadows.card,
      ]}
    >
      <View style={styles.row}>
        <Avatar
          name={doctor.name}
          source={doctor.avatarImage}
          gradient={doctor.gradient}
          size={52}
        />
        <View style={styles.flex}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {doctor.name}
          </AppText>
          <AppText color="secondary">{doctor.specialty}</AppText>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: cancelled ? (t.isDark ? '#3B1D24' : '#FDECEC') : t.colors.blueTint },
          ]}
        >
          <AppText
            variant="caption"
            style={{ color: cancelled ? t.colors.error : t.colors.primary }}
          >
            {cancelled ? 'Cancelled' : 'Completed'}
          </AppText>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.divider }]} />
      <View style={styles.meta}>
        <Feather name="calendar" size={16} color={t.colors.textSecondary} />
        <AppText variant="caption" color="secondary" style={styles.metaText}>
          {formatDateLabel(s)}
        </AppText>
        <Feather name="clock" size={16} color={t.colors.textSecondary} />
        <AppText variant="caption" color="secondary" style={styles.metaText}>
          {formatTimeRange(s, new Date(appointment.endISO))}
        </AppText>
      </View>
      {appointment.notes ? (
        <AppText variant="small" color="muted" numberOfLines={2} style={styles.notes}>
          “{appointment.notes}”
        </AppText>
      ) : null}
      <Button
        title="Book again"
        variant="ghost"
        size="sm"
        onPress={onBookAgain}
        style={styles.btn}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  divider: { height: 1, marginVertical: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaText: { marginRight: 12 },
  notes: { marginTop: 10 },
  btn: { marginTop: 14 },
});
