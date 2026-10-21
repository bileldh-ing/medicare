import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  SlideInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { BookButton } from '@/components/booking/BookButton';
import { BookingSheet } from '@/components/booking/BookingSheet';
import { DateStrip } from '@/components/booking/DateStrip';
import { DoctorHero, FlyingPhoto, heroTarget, type Origin } from '@/components/booking/DoctorHero';
import { MonthHeader } from '@/components/booking/MonthHeader';
import { TimeGrid } from '@/components/booking/TimeGrid';
import { shareDoctor } from '@/components/home/QuickActionsSheet';
import { AppText } from '@/components/ui/AppText';
import { type ButtonState } from '@/components/ui/Button';
import { CircleButton } from '@/components/ui/CircleButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';
import {
  BOOKING_ERROR_MESSAGES,
  bookedStartTimes,
  validateBooking,
} from '@/features/appointments/bookingRules';
import {
  addDays,
  addMonths,
  formatMonthLabel,
  isBeforeDay,
  isSameDay,
  startOfDay,
  startOfMonth,
  weekDays,
} from '@/features/appointments/dateUtils';
import {
  countAvailable,
  generateSlots,
  pageCount,
  pageOf,
  paginate,
} from '@/features/appointments/slots';
import { getDoctor, type Doctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useNow } from '@/utils/hooks';
import { springs, useIsReducedMotion } from '@/utils/motion';

const LOCALE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en-US';
  }
})();

const WEEKDAY_LONG = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
];

function firstBookableDay(doctor: Doctor, now: Date, booked: number[]): Date {
  for (let i = 0; i < 21; i++) {
    const d = addDays(startOfDay(now), i);
    const slots = generateSlots(doctor.id, d, {
      now,
      bookedStartTimes: booked,
      hours: doctor.workingHours,
    });
    if (countAvailable(slots) > 0) return d;
  }
  return startOfDay(now);
}

export default function DoctorScreen() {
  const params = useLocalSearchParams<{
    id: string;
    reschedule?: string;
    ox?: string;
    oy?: string;
    ow?: string;
    oh?: string;
  }>();
  const doctor = getDoctor(params.id);
  if (!doctor) return <NotFound />;
  return <DoctorBooking doctor={doctor} params={params} />;
}

function NotFound() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { paddingTop: insets.top + 40 }]}>
      <EmptyState
        illustration="search"
        title="Doctor not found"
        message="This profile is no longer available."
        actionLabel="Go back"
        onAction={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </View>
  );
}

interface BookingProps {
  doctor: Doctor;
  params: { reschedule?: string; ox?: string; oy?: string; ow?: string; oh?: string };
}

function DoctorBooking({ doctor, params }: BookingProps) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const reduced = useIsReducedMotion();
  const now = useNow();

  const appointments = useAppointmentsStore((s) => s.appointments);
  const book = useAppointmentsStore((s) => s.book);
  const reschedule = useAppointmentsStore((s) => s.reschedule);

  const rescheduling = params.reschedule
    ? appointments.find((a) => a.id === params.reschedule && a.status === 'upcoming')
    : undefined;
  const rescheduleStart = rescheduling ? new Date(rescheduling.startISO).getTime() : undefined;
  const booked = useMemo(
    () => bookedStartTimes(appointments, rescheduling?.id),
    [appointments, rescheduling?.id],
  );

  const origin: Origin | null = useMemo(() => {
    const [x, y, w, h] = [params.ox, params.oy, params.ow, params.oh].map((v) => Number(v));
    return [x, y, w, h].every((v) => Number.isFinite(v)) && w
      ? { x: x!, y: y!, w: w!, h: h! }
      : null;
  }, [params.ox, params.oy, params.ow, params.oh]);

  // ---------- selection state ----------
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (rescheduleStart !== undefined) {
      const d = startOfDay(new Date(rescheduleStart));
      return isBeforeDay(d, now) ? startOfDay(now) : d;
    }
    return firstBookableDay(doctor, now, booked);
  });
  const [selectedStart, setSelectedStart] = useState<number | null>(rescheduleStart ?? null);
  const [page, setPage] = useState(0);

  const slots = useMemo(
    () =>
      generateSlots(doctor.id, selectedDate, {
        now,
        bookedStartTimes: booked,
        allowStartTime: rescheduleStart,
        hours: doctor.workingHours,
      }),
    [doctor, selectedDate, now, booked, rescheduleStart],
  );
  const available = countAvailable(slots);
  const pages = pageCount(slots.length);
  const visible = paginate(slots, page);
  const selectedSlot =
    slots.find((s) => s.start.getTime() === selectedStart && s.status === 'available') ?? null;

  // Show the page containing the selection (reschedule) or the first free slot.
  const lastDayKey = useRef<string>('');
  useEffect(() => {
    const key = selectedDate.toDateString();
    if (lastDayKey.current === key) return;
    lastDayKey.current = key;
    const p = selectedStart
      ? pageOf(slots, (s) => s.start.getTime() === selectedStart)
      : pageOf(slots, (s) => s.status === 'available');
    setPage(p);
  }, [selectedDate, slots, selectedStart]);

  const today = startOfDay(now);
  const days = useMemo(() => weekDays(selectedDate), [selectedDate]);
  const canGoBackWeek = !isBeforeDay(addDays(days[0] ?? today, -1), today);

  const selectDay = useCallback((d: Date) => {
    setSelectedDate(startOfDay(d));
    setSelectedStart((prev) => (prev && isSameDay(new Date(prev), d) ? prev : null));
  }, []);
  const clampToToday = (d: Date) => (isBeforeDay(d, today) ? today : d);
  const changeWeek = (dir: -1 | 1) => selectDay(clampToToday(addDays(selectedDate, dir * 7)));
  const changeMonth = (dir: -1 | 1) => selectDay(clampToToday(addMonths(selectedDate, dir)));
  const prevMonthDisabled = startOfMonth(selectedDate).getTime() <= startOfMonth(today).getTime();
  const changePage = useCallback(
    (dir: -1 | 1) => setPage((p) => Math.min(pages - 1, Math.max(0, p + dir))),
    [pages],
  );

  // ---------- booking flow ----------
  const [btn, setBtn] = useState<ButtonState>('idle');
  const [burst, setBurst] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState<ButtonState>('idle');

  const onBookPress = () => {
    const v = validateBooking({
      doctorId: doctor.id,
      start: selectedSlot?.start ?? null,
      appointments,
      now: new Date(),
      hours: doctor.workingHours,
      excludeId: rescheduling?.id,
    });
    if (!v.ok) {
      haptics.warning();
      toast.error(BOOKING_ERROR_MESSAGES[v.error]);
      return;
    }
    setBtn('loading');
    setTimeout(
      () => {
        setBtn('success');
        haptics.success();
        if (!reduced) setBurst((b) => b + 1);
        setTimeout(
          () => {
            setSheetOpen(true);
            setBtn('idle');
          },
          reduced ? 150 : 650,
        );
      },
      reduced ? 100 : 450,
    );
  };

  const onConfirm = (notes: string) => {
    if (!selectedSlot) return;
    setSheetState('loading');
    const result = rescheduling
      ? reschedule({
          id: rescheduling.id,
          start: selectedSlot.start,
          notes,
          hours: doctor.workingHours,
        })
      : book({ doctorId: doctor.id, start: selectedSlot.start, notes, hours: doctor.workingHours });
    if (!result.ok) {
      setSheetState('idle');
      haptics.error();
      toast.error(BOOKING_ERROR_MESSAGES[result.error]);
      return;
    }
    setSheetState('success');
    haptics.success();
    setTimeout(() => {
      setSheetOpen(false);
      setSheetState('idle');
      router.replace({
        pathname: '/booking-success',
        params: {
          appointmentId: result.appointment.id,
          mode: rescheduling ? 'reschedule' : 'book',
        },
      });
    }, 450);
  };

  // ---------- motion: parallax, drag-to-dismiss, flying photo ----------
  const heroH = Math.min(460, Math.max(360, screenH * 0.5));
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const fly = useSharedValue(origin && !reduced ? 0 : 1);
  useEffect(() => {
    if (origin && !reduced)
      fly.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [origin, reduced, fly]);
  const target = heroTarget(width, heroH, doctor.cutoutAspect);

  const dragY = useSharedValue(0);
  const goBack = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace('/')),
    [router],
  );
  const dismissPan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetY(18)
    .failOffsetX([-20, 20])
    .onChange((e) => {
      if (scrollY.get() <= 0) dragY.set(Math.max(0, dragY.get() + e.changeY));
    })
    .onEnd((e) => {
      if (dragY.get() > 140 || (dragY.get() > 40 && e.velocityY > 1000)) {
        scheduleOnRN(goBack);
      } else {
        dragY.set(withSpring(0, springs.gentle));
      }
    });
  const containerStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(dragY.get(), [0, 200], [0, 36], 'clamp'),
    transform: [
      { translateY: dragY.get() * 0.6 },
      { scale: interpolate(dragY.get(), [0, 300], [1, 0.88], 'clamp') },
    ],
  }));

  const notWorking = slots.length === 0;
  const bottomBarH = 76 + Math.max(insets.bottom, 12);

  return (
    <View style={[styles.flex, { backgroundColor: t.isDark ? '#05080F' : '#DCE5F7' }]}>
      <Animated.View
        style={[styles.flex, styles.clip, { backgroundColor: t.colors.background }, containerStyle]}
      >
        <LinearGradient
          colors={[t.isDark ? '#16223A' : '#E3EAF8', t.colors.background]}
          style={[styles.gradient, { height: heroH + 80 }]}
        />
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomBarH + 16 }}
        >
          <GestureDetector gesture={dismissPan}>
            <View>
              <DoctorHero
                doctor={doctor}
                height={heroH}
                topInset={insets.top}
                scrollY={scrollY}
                fly={fly}
                reduced={reduced}
              />
            </View>
          </GestureDetector>

          <Animated.View
            entering={reduced ? undefined : SlideInDown.springify().damping(22).stiffness(170)}
            style={[
              styles.sheet,
              {
                backgroundColor: t.colors.surface,
                borderTopLeftRadius: t.radii.sheet,
                borderTopRightRadius: t.radii.sheet,
              },
            ]}
          >
            {rescheduling ? (
              <View style={[styles.banner, { backgroundColor: t.colors.blueTint }]}>
                <Feather name="repeat" size={16} color={t.colors.primary} />
                <AppText variant="caption" color="accent" style={styles.flex}>
                  Re-scheduling: your current time is highlighted. Pick a new slot.
                </AppText>
              </View>
            ) : null}

            <MonthHeader
              title="Select Date"
              label={formatMonthLabel(selectedDate, LOCALE)}
              onPrev={() => changeMonth(-1)}
              onNext={() => changeMonth(1)}
              prevDisabled={prevMonthDisabled}
            />
            <View style={styles.dateStrip}>
              <DateStrip
                days={days}
                selected={selectedDate}
                now={now}
                onSelect={selectDay}
                onSwipeWeek={changeWeek}
                canGoBack={canGoBackWeek}
              />
            </View>

            <View
              style={[
                styles.timePanel,
                { backgroundColor: t.colors.blueTint, borderRadius: t.radii.card },
              ]}
            >
              <MonthHeader
                title="Select Time"
                label={`${available} ${available === 1 ? 'Slot' : 'Slots'}`}
                onPrev={() => changePage(-1)}
                onNext={() => changePage(1)}
                prevDisabled={page === 0}
                nextDisabled={page >= pages - 1}
                prevLabel="Previous times"
                nextLabel="More times"
              />
              <View style={styles.grid}>
                {notWorking ? (
                  <View style={styles.offDay}>
                    <Feather name="moon" size={22} color={t.colors.textSecondary} />
                    <AppText color="secondary" style={styles.offText}>
                      {doctor.name} doesn&apos;t see patients on{' '}
                      {WEEKDAY_LONG[selectedDate.getDay()]}.
                    </AppText>
                  </View>
                ) : (
                  <>
                    <TimeGrid
                      slots={visible}
                      selectedId={selectedSlot?.id ?? null}
                      onSelect={(s) => setSelectedStart(s.start.getTime())}
                      renderKey={`${selectedDate.toDateString()}-${page}`}
                      onSwipePage={changePage}
                    />
                    {available === 0 ? (
                      <AppText variant="caption" color="secondary" style={styles.fullDay}>
                        No free times left on this day. Try another day.
                      </AppText>
                    ) : null}
                  </>
                )}
              </View>
              {pages > 1 ? (
                <View style={styles.pageDots} accessibilityLabel={`Page ${page + 1} of ${pages}`}>
                  {Array.from({ length: pages }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pageDot,
                        {
                          backgroundColor: i === page ? t.colors.primary : t.colors.blueTintBorder,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.about}>
              <AppText variant="sectionTitle" accessibilityRole="header">
                About
              </AppText>
              <AppText color="secondary" style={styles.bio}>
                {doctor.bio}
              </AppText>
            </View>
          </Animated.View>
        </Animated.ScrollView>

        {/* Floating top buttons */}
        <View style={[styles.topRow, { top: insets.top + 8 }]} pointerEvents="box-none">
          <CircleButton icon="arrow-left" accessibilityLabel="Go back" onPress={goBack} />
          <CircleButton
            icon="share-2"
            accessibilityLabel={`Share ${doctor.name}`}
            onPress={() => shareDoctor(doctor)}
          />
        </View>

        {/* Bottom bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: t.colors.surface,
              paddingBottom: Math.max(insets.bottom, 12),
              height: bottomBarH,
            },
          ]}
        >
          <CircleButton
            icon="message-circle"
            accessibilityLabel={`Message ${doctor.name}`}
            onPress={() =>
              router.push({ pathname: '/chat/[doctorId]', params: { doctorId: doctor.id } })
            }
            size={56}
          />
          <BookButton
            title={rescheduling ? 'Re-Schedule Appointment' : 'Book an Appointment'}
            state={btn}
            burstKey={burst}
            onPress={onBookPress}
          />
        </View>
      </Animated.View>

      {origin && !reduced ? (
        <FlyingPhoto doctor={doctor} origin={origin} target={target} fly={fly} />
      ) : null}

      <BookingSheet
        visible={sheetOpen}
        doctor={doctor}
        start={selectedSlot?.start ?? null}
        end={selectedSlot?.end ?? null}
        initialNotes={rescheduling?.notes ?? ''}
        mode={rescheduling ? 'reschedule' : 'book'}
        state={sheetState}
        onConfirm={onConfirm}
        onClose={() => sheetState === 'idle' && setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheet: {
    marginTop: -36,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 12,
    minHeight: 520,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
  },
  dateStrip: { marginTop: 14 },
  timePanel: { marginTop: 24, padding: 16, paddingBottom: 14 },
  grid: { marginTop: 10, minHeight: 64 },
  offDay: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  offText: { textAlign: 'center' },
  fullDay: { textAlign: 'center', marginTop: 6 },
  pageDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  pageDot: { width: 6, height: 6, borderRadius: 3 },
  about: { marginTop: 26 },
  bio: { marginTop: 8 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
