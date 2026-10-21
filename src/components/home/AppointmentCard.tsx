import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CircleButton } from '@/components/ui/CircleButton';
import type { Appointment } from '@/features/appointments/bookingRules';
import { formatDateLabel, formatTimeRange } from '@/features/appointments/dateUtils';
import type { Doctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';

interface Props {
  appointment: Appointment;
  doctor: Doctor;
  onReschedule?: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
  onVideo?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** The blue "upcoming appointment" card from the reference. */
export const AppointmentCard = memo(function AppointmentCard({
  appointment,
  doctor,
  onReschedule,
  onSecondary,
  secondaryLabel = 'View Profile',
  onVideo,
  style,
}: Props) {
  const t = useTheme();
  const start = new Date(appointment.startISO);
  const end = new Date(appointment.endISO);
  const dateLabel = formatDateLabel(start);
  const timeLabel = formatTimeRange(start, end);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.colors.primary, borderRadius: t.radii.card },
        t.shadows.strong,
        style,
      ]}
      accessible={false}
    >
      <View style={styles.top}>
        <Avatar
          name={doctor.name}
          source={doctor.avatarImage}
          gradient={doctor.gradient}
          blurhash={doctor.blurhash}
          size={64}
          borderColor="rgba(255,255,255,0.9)"
        />
        <View
          style={styles.who}
          accessible
          accessibilityLabel={`Appointment with ${doctor.name}, ${doctor.specialty}, ${dateLabel}, ${timeLabel}`}
        >
          <AppText variant="cardTitle" color="onBlue" numberOfLines={1} style={styles.name}>
            {doctor.name}
          </AppText>
          <AppText variant="body" color="onBlueMuted" numberOfLines={1}>
            {doctor.specialty}
          </AppText>
        </View>
        <CircleButton
          icon="video"
          color={t.colors.primary}
          background="#FFFFFF"
          accessibilityLabel={`Video call with ${doctor.name}`}
          onPress={onVideo}
          shadow={false}
          size={52}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Info icon="calendar" label="Date" value={dateLabel} />
        <Info icon="clock" label="Time" value={timeLabel} />
      </View>

      <View style={styles.actions}>
        <Button
          title="Re-Schedule"
          variant="white"
          size="md"
          onPress={onReschedule}
          style={styles.action}
          accessibilityLabel={`Re-schedule appointment with ${doctor.name}`}
        />
        <Button
          title={secondaryLabel}
          variant="translucent"
          size="md"
          onPress={onSecondary}
          style={styles.action}
        />
      </View>
    </View>
  );
});

function Info({
  icon,
  label,
  value,
}: {
  icon: 'calendar' | 'clock';
  label: string;
  value: string;
}) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={18} color="#fff" />
      </View>
      <View style={styles.infoTexts}>
        <AppText variant="caption" color="onBlueMuted">
          {label}
        </AppText>
        <AppText variant="bodyMedium" color="onBlue" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20 },
  top: { flexDirection: 'row', alignItems: 'center' },
  who: { flex: 1, marginLeft: 14, marginRight: 8 },
  name: { fontSize: 19, marginBottom: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 18 },
  infoRow: { flexDirection: 'row', gap: 12 },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTexts: { marginLeft: 10, flex: 1 },
  actions: { flexDirection: 'row', gap: 14, marginTop: 20 },
  action: { flex: 1 },
});
