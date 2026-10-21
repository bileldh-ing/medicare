import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/booking/Confetti';
import { AppointmentStack } from '@/components/home/AppointmentStack';
import { DoctorCard } from '@/components/home/DoctorCard';
import { FilterChips } from '@/components/home/FilterChips';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { QuickActionsSheet } from '@/components/home/QuickActionsSheet';
import { RemindersSheet } from '@/components/home/RemindersSheet';
import { SearchBar } from '@/components/home/SearchBar';
import { useDoctorActions } from '@/components/home/useDoctorActions';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DoctorCardSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { APP_NAME } from '@/constants/app';
import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';
import {
  dueReminders,
  upcomingSorted,
  type Appointment,
} from '@/features/appointments/bookingRules';
import { useAuthStore } from '@/features/auth/authStore';
import { useBookmarksStore } from '@/features/doctors/bookmarksStore';
import type { Doctor } from '@/features/doctors/doctors';
import { selectPopular, useDoctorsStore } from '@/features/doctors/doctorsStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useTheme } from '@/theme';
import { useAutoPastStatuses, useNow, useTabBarSpace } from '@/utils/hooks';
import { useMotion } from '@/utils/motion';

const H_PAD = 20;

export default function HomeScreen() {
  const t = useTheme();
  const m = useMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const now = useNow();
  useAutoPastStatuses(now);

  const user = useAuthStore((s) => s.user);
  const justSignedUp = useAuthStore((s) => s.justSignedUp);
  const consumeWelcome = useAuthStore((s) => s.consumeWelcome);
  const appointments = useAppointmentsStore((s) => s.appointments);
  const apptsHydrated = useAppointmentsStore((s) => s.hasHydrated);
  const seenReminderIds = useAppointmentsStore((s) => s.seenReminderIds);
  const markRemindersSeen = useAppointmentsStore((s) => s.markRemindersSeen);
  const refreshStatuses = useAppointmentsStore((s) => s.refreshStatuses);
  const doctors = useDoctorsStore((s) => s.doctors);
  const filter = useDoctorsStore((s) => s.filter);
  const setFilter = useDoctorsStore((s) => s.setFilter);
  const bookmarkIds = useBookmarksStore((s) => s.ids);
  const notificationsOn = useSettingsStore((s) => s.notifications);
  const { openDoctor, onToggleBookmark, onLongPress, quickDoctor, closeQuick } = useDoctorActions();

  const listRef = useRef<FlashListRef<Doctor>>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [burst, setBurst] = useState(0);

  const upcoming = useMemo(() => upcomingSorted(appointments, now), [appointments, now]);
  const reminders = useMemo(() => dueReminders(appointments, now), [appointments, now]);
  const hasUnread = notificationsOn && reminders.some((r) => !seenReminderIds.includes(r.id));
  const popular = useMemo(() => selectPopular(doctors, filter), [doctors, filter]);
  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  useEffect(() => {
    if (!justSignedUp || !user) return;
    const id = requestAnimationFrame(() => {
      setBurst((b) => b + 1);
      toast.success(`Welcome to ${APP_NAME}, ${user.name.split(' ')[0]}!`);
      consumeWelcome();
    });
    return () => cancelAnimationFrame(id);
  }, [justSignedUp, user, consumeWelcome]);

  const onFilter = useCallback(
    (f: typeof filter) => {
      if (!m.reduced) {
        listRef.current?.prepareForLayoutAnimationRender();
        LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));
      }
      setFilter(f);
    },
    [m.reduced, setFilter],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshStatuses(new Date());
    setTimeout(() => setRefreshing(false), 700);
  }, [refreshStatuses]);

  const reschedule = useCallback(
    (a: Appointment) =>
      router.push({ pathname: '/doctor/[id]', params: { id: a.doctorId, reschedule: a.id } }),
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Doctor; index: number }) => (
      <Animated.View entering={m.enter(Math.min(index, 6) + 5)} style={styles.hPad}>
        <DoctorCard
          doctor={item}
          bookmarked={bookmarkSet.has(item.id)}
          onPress={openDoctor}
          onToggleBookmark={onToggleBookmark}
          onLongPress={onLongPress}
        />
      </Animated.View>
    ),
    [bookmarkSet, m, onLongPress, onToggleBookmark, openDoctor],
  );

  const header = (
    <View style={{ paddingTop: insets.top + 12 }}>
      <Animated.View entering={m.enter(0)} style={styles.hPad}>
        <GreetingHeader
          name={user?.name ?? 'Guest'}
          avatarUri={user?.avatarUri ?? null}
          hasUnread={hasUnread}
          now={now}
          onAvatarPress={() => router.navigate('/settings')}
          onBellPress={() => {
            setRemindersOpen(true);
            markRemindersSeen(reminders.map((r) => r.id));
          }}
        />
      </Animated.View>
      <Animated.View entering={m.enter(1)} style={styles.hPad}>
        <AppText variant="hero" style={styles.hero} accessibilityRole="header">
          How are you feeling{'\n'}today?
        </AppText>
      </Animated.View>
      <Animated.View entering={m.enter(2)} style={[styles.hPad, styles.search]}>
        <SearchBar onPress={() => router.push('/search')} />
      </Animated.View>

      <Animated.View entering={m.enter(3)} style={[styles.hPad, styles.sectionRow]}>
        <AppText variant="sectionTitle" accessibilityRole="header">
          Upcoming Appointments
        </AppText>
        <Pressable
          onPress={() => router.navigate('/appointments')}
          hitSlop={12}
          accessibilityRole="link"
        >
          <AppText color="secondary">View All</AppText>
        </Pressable>
      </Animated.View>
      <Animated.View entering={m.enter(4)} style={styles.hPad}>
        {!apptsHydrated ? (
          <DoctorCardSkeleton />
        ) : upcoming.length ? (
          <AppointmentStack
            appointments={upcoming}
            onReschedule={reschedule}
            onViewProfile={(a) =>
              router.push({ pathname: '/doctor/[id]', params: { id: a.doctorId } })
            }
            onVideo={(a) =>
              router.push({ pathname: '/chat/[doctorId]', params: { doctorId: a.doctorId } })
            }
          />
        ) : (
          <Card style={styles.emptyCard} padded={false}>
            <EmptyState
              illustration="calendar"
              title="No upcoming visits"
              message="Choose a doctor below and pick a time that suits you."
              actionLabel="Book your first appointment"
              onAction={() => {
                const first = popular[0];
                if (first) openDoctor(first);
              }}
              compact
            />
          </Card>
        )}
      </Animated.View>

      <Animated.View entering={m.enter(5)} style={[styles.hPad, styles.sectionRow]}>
        <AppText variant="sectionTitle" accessibilityRole="header">
          Popular Doctors
        </AppText>
        <Pressable
          onPress={() => router.push({ pathname: '/search', params: { all: '1' } })}
          hitSlop={12}
          accessibilityRole="link"
        >
          <AppText color="secondary">View All</AppText>
        </Pressable>
      </Animated.View>
      <Animated.View entering={m.enter(6)} style={styles.chips}>
        <FilterChips value={filter} onChange={onFilter} inset={H_PAD} />
      </Animated.View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <FlashList
        ref={listRef}
        data={popular}
        keyExtractor={(d) => d.id}
        renderItem={renderItem}
        extraData={bookmarkSet}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <AppText color="secondary" style={styles.noDoctors}>
            No doctors in this specialty yet.
          </AppText>
        }
        contentContainerStyle={{ paddingBottom: bottomSpace }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
            progressViewOffset={insets.top}
          />
        }
      />
      <Confetti burstKey={burst} />
      <QuickActionsSheet
        doctor={quickDoctor}
        bookmarked={!!quickDoctor && bookmarkSet.has(quickDoctor.id)}
        onClose={closeQuick}
        onBook={(d) => openDoctor(d)}
        onViewProfile={(d) => openDoctor(d)}
        onToggleBookmark={onToggleBookmark}
      />
      <RemindersSheet
        visible={remindersOpen}
        reminders={reminders}
        notificationsOn={notificationsOn}
        onClose={() => setRemindersOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hPad: { paddingHorizontal: H_PAD },
  hero: { marginTop: 24 },
  search: { marginTop: 22 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 6,
  },
  chips: { marginTop: 8, marginBottom: 16 },
  emptyCard: { marginTop: 8 },
  noDoctors: { textAlign: 'center', marginTop: 24 },
});
