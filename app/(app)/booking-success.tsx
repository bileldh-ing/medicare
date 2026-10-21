import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/booking/Confetti';
import { AnimatedCheck } from '@/components/ui/AnimatedCheck';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';
import { formatDateLabel, formatTimeRange } from '@/features/appointments/dateUtils';
import { getDoctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { useMotion } from '@/utils/motion';

/** Modal shown after a booking or re-schedule is saved. */
export default function BookingSuccess() {
  const { appointmentId, mode } = useLocalSearchParams<{ appointmentId?: string; mode?: string }>();
  const t = useTheme();
  const m = useMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appt = useAppointmentsStore((s) => s.appointments.find((a) => a.id === appointmentId));
  const doctor = appt ? getDoctor(appt.doctorId) : undefined;
  const start = appt ? new Date(appt.startISO) : null;

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: t.colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <View style={styles.center}>
        <Animated.View
          entering={m.reduced ? undefined : ZoomIn.springify().damping(12)}
          style={[styles.badge, { backgroundColor: t.colors.success }]}
        >
          <AnimatedCheck size={72} color="#fff" delay={200} />
        </Animated.View>
        <Confetti burstKey={m.reduced ? 0 : 1} />
        <AppText variant="hero" style={styles.title} accessibilityRole="header">
          {mode === 'reschedule' ? 'Re-scheduled!' : 'Appointment booked!'}
        </AppText>
        <AppText color="secondary" style={styles.sub}>
          {mode === 'reschedule'
            ? 'Your new time is confirmed.'
            : 'We saved it to your appointments.'}
        </AppText>
        {appt && doctor && start ? (
          <View
            style={[
              styles.card,
              { backgroundColor: t.colors.surface, borderRadius: t.radii.card },
              t.shadows.card,
            ]}
          >
            <Avatar
              name={doctor.name}
              source={doctor.avatarImage}
              gradient={doctor.gradient}
              size={56}
            />
            <View style={styles.flex}>
              <AppText variant="cardTitle">{doctor.name}</AppText>
              <AppText color="secondary">{doctor.specialty}</AppText>
              <AppText variant="bodyMedium" color="accent" style={styles.when}>
                {formatDateLabel(start)} · {formatTimeRange(start, new Date(appt.endISO))}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          title="View appointments"
          onPress={() => {
            router.dismissAll();
            router.navigate('/appointments');
          }}
        />
        <Button
          title="Back to Home"
          variant="ghost"
          onPress={() => {
            router.dismissAll();
            router.navigate('/');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 28, textAlign: 'center' },
  sub: { marginTop: 8, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginTop: 28,
    alignSelf: 'stretch',
  },
  when: { marginTop: 6 },
  actions: { paddingHorizontal: 20, gap: 12 },
});
