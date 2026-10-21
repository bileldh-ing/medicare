import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppointmentCard } from '@/components/home/AppointmentCard';
import { PastAppointmentCard } from '@/components/home/PastAppointmentCard';
import { AppText } from '@/components/ui/AppText';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/Toast';
import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';
import {
  filterByStatus,
  type Appointment,
  type AppointmentStatus,
} from '@/features/appointments/bookingRules';
import { formatDateLabel } from '@/features/appointments/dateUtils';
import { getDoctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useAutoPastStatuses, useNow, useTabBarSpace } from '@/utils/hooks';
import { useMotion } from '@/utils/motion';

const SEGMENTS = ['Upcoming', 'Past', 'Cancelled'] as const;
type Segment = (typeof SEGMENTS)[number];
const STATUS: Record<Segment, AppointmentStatus> = {
  Upcoming: 'upcoming',
  Past: 'past',
  Cancelled: 'cancelled',
};

export default function AppointmentsScreen() {
  const t = useTheme();
  const m = useMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottom = useTabBarSpace();
  const now = useNow();
  useAutoPastStatuses(now);

  const appointments = useAppointmentsStore((s) => s.appointments);
  const cancel = useAppointmentsStore((s) => s.cancel);
  const refreshStatuses = useAppointmentsStore((s) => s.refreshStatuses);
  const [segment, setSegment] = useState<Segment>('Upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);

  const lists = useMemo(
    () => ({
      Upcoming: filterByStatus(appointments, 'upcoming'),
      Past: filterByStatus(appointments, 'past'),
      Cancelled: filterByStatus(appointments, 'cancelled'),
    }),
    [appointments],
  );

  const goTo = (s: Segment) => {
    setSegment(s);
    pager.current?.scrollTo({ x: SEGMENTS.indexOf(s) * width, animated: !m.reduced });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshStatuses(new Date());
    setTimeout(() => setRefreshing(false), 700);
  }, [refreshStatuses]);

  const openDoctor = useCallback(
    (doctorId: string, rescheduleId?: string) =>
      router.push({
        pathname: '/doctor/[id]',
        params: rescheduleId ? { id: doctorId, reschedule: rescheduleId } : { id: doctorId },
      }),
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Appointment; index: number }) => {
      const doctor = getDoctor(item.doctorId);
      if (!doctor) return null;
      return (
        <Animated.View entering={m.enter(Math.min(index, 5))} style={styles.item}>
          {item.status === 'upcoming' ? (
            <AppointmentCard
              appointment={item}
              doctor={doctor}
              onReschedule={() => openDoctor(item.doctorId, item.id)}
              secondaryLabel="Cancel"
              onSecondary={() => setToCancel(item)}
              onVideo={() =>
                router.push({ pathname: '/chat/[doctorId]', params: { doctorId: item.doctorId } })
              }
            />
          ) : (
            <PastAppointmentCard
              appointment={item}
              doctor={doctor}
              onBookAgain={() => openDoctor(item.doctorId)}
            />
          )}
        </Animated.View>
      );
    },
    [m, openDoctor, router],
  );

  const doCancel = () => {
    if (!toCancel) return;
    const ok = cancel(toCancel.id);
    setToCancel(null);
    if (ok) {
      haptics.success();
      toast.show('Appointment cancelled');
    }
  };

  const cancelDoctor = toCancel ? getDoctor(toCancel.doctorId) : undefined;

  return (
    <View
      style={[styles.flex, { backgroundColor: t.colors.background, paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <AppText variant="screenTitle" accessibilityRole="header">
          Appointments
        </AppText>
        <View style={styles.segment}>
          <SegmentedControl
            options={SEGMENTS}
            value={segment}
            onChange={goTo}
            counts={{ Upcoming: lists.Upcoming.length }}
          />
        </View>
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          const s = SEGMENTS[i];
          if (s && s !== segment) {
            haptics.selection();
            setSegment(s);
          }
        }}
        accessibilityHint="Swipe left or right to switch between upcoming, past and cancelled"
      >
        {SEGMENTS.map((s) => (
          <View key={s} style={{ width }}>
            <FlashList
              data={lists[s]}
              keyExtractor={(a) => a.id}
              renderItem={renderItem}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: bottom,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={t.colors.primary}
                  colors={[t.colors.primary]}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  illustration="calendar"
                  title={
                    STATUS[s] === 'upcoming'
                      ? 'No upcoming appointments'
                      : STATUS[s] === 'past'
                        ? 'No past visits yet'
                        : 'Nothing cancelled'
                  }
                  message={
                    STATUS[s] === 'upcoming'
                      ? 'Find a doctor and book a time that works for you.'
                      : 'Your history will show up here.'
                  }
                  actionLabel={STATUS[s] === 'upcoming' ? 'Find a doctor' : undefined}
                  onAction={
                    STATUS[s] === 'upcoming'
                      ? () => router.push({ pathname: '/search', params: { all: '1' } })
                      : undefined
                  }
                />
              }
            />
          </View>
        ))}
      </ScrollView>

      <ConfirmSheet
        visible={!!toCancel}
        title="Cancel appointment?"
        message={
          toCancel && cancelDoctor
            ? `Your visit with ${cancelDoctor.name} on ${formatDateLabel(new Date(toCancel.startISO))} will be cancelled.`
            : ''
        }
        confirmLabel="Cancel visit"
        cancelLabel="Keep it"
        destructive
        onConfirm={doCancel}
        onClose={() => setToCancel(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20 },
  segment: { marginTop: 16, marginBottom: 8 },
  item: { marginBottom: 16 },
});
