import { Feather, Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { HighlightText } from '@/components/ui/HighlightText';
import type { Doctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs, useIsReducedMotion } from '@/utils/motion';

export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  doctor: Doctor;
  bookmarked: boolean;
  onPress: (doctor: Doctor, origin?: OriginRect) => void;
  onToggleBookmark: (doctor: Doctor) => void;
  onLongPress: (doctor: Doctor) => void;
  /** When set, name/specialty matches are highlighted (search results). */
  query?: string;
  subtitle?: string;
}

const ACTION_W = 96;
const PHOTO = 96;

/**
 * White doctor card: swipe LEFT to reveal a Bookmark action (swipe right is disabled),
 * long-press for quick actions, tap the bookmark icon to toggle with a pop.
 */
export const DoctorCard = memo(function DoctorCard({
  doctor,
  bookmarked,
  onPress,
  onToggleBookmark,
  onLongPress,
  query,
  subtitle,
}: Props) {
  const t = useTheme();
  const reduced = useIsReducedMotion();
  const photoRef = useRef<ComponentRef<typeof View>>(null);
  const x = useSharedValue(0);
  const pop = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!reduced) {
      pop.set(withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, springs.bouncy)));
    }
  }, [bookmarked, reduced, pop]);

  const toggle = useCallback(() => {
    haptics.success();
    onToggleBookmark(doctor);
  }, [doctor, onToggleBookmark]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 1000]) // only leftward swipes activate
    .failOffsetY([-10, 10])
    .onChange((e) => {
      x.set(Math.min(0, Math.max(-ACTION_W * 1.4, x.get() + e.changeX)));
    })
    .onEnd((e) => {
      const open = x.get() < -ACTION_W / 2 || e.velocityX < -700;
      x.set(withSpring(open ? -ACTION_W : 0, springs.gentle));
      if (open) scheduleOnRN(haptics.light);
    });

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const actionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-ACTION_W, -20, 0], [1, 0.4, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(x.get(), [-ACTION_W, 0], [1, 0.7], Extrapolation.CLAMP) }],
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  const handlePress = () => {
    if (x.get() < -4) {
      x.set(withSpring(0, springs.gentle));
      return;
    }
    const node = photoRef.current;
    if (node) {
      node.measureInWindow((mx: number, my: number, width: number, height: number) =>
        onPress(doctor, width ? { x: mx, y: my, width, height } : undefined),
      );
    } else {
      onPress(doctor);
    }
  };

  const label = `${doctor.name}, ${doctor.specialty}, rated ${doctor.rating} from ${doctor.reviewsCount} reviews${
    bookmarked ? ', bookmarked' : ''
  }`;

  return (
    <View style={styles.outer}>
      <Animated.View style={[styles.action, actionStyle]}>
        <Pressable
          onPress={() => {
            toggle();
            x.set(withSpring(0, springs.gentle));
          }}
          style={[
            styles.actionBtn,
            { backgroundColor: t.colors.primary, borderRadius: t.radii.card },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            bookmarked ? `Remove ${doctor.name} from bookmarks` : `Bookmark ${doctor.name}`
          }
        >
          <Feather name="bookmark" size={22} color="#fff" />
          <AppText variant="caption" color="onBlue" style={styles.actionText}>
            {bookmarked ? 'Saved' : 'Bookmark'}
          </AppText>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>
          <Pressable
            onPress={handlePress}
            onLongPress={() => {
              haptics.medium();
              onLongPress(doctor);
            }}
            delayLongPress={380}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: t.colors.surface,
                borderRadius: t.radii.card,
                opacity: pressed ? 0.94 : 1,
              },
              t.shadows.card,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Opens profile and booking. Long press for quick actions."
            accessibilityActions={[
              { name: 'longpress', label: 'Quick actions' },
              { name: 'bookmark', label: bookmarked ? 'Remove bookmark' : 'Bookmark' },
            ]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'longpress') onLongPress(doctor);
              if (e.nativeEvent.actionName === 'bookmark') toggle();
            }}
          >
            <View
              ref={photoRef}
              collapsable={false}
              style={[styles.photo, { backgroundColor: t.colors.blueTint }]}
            >
              <Avatar
                name={doctor.name}
                source={doctor.avatarImage}
                gradient={doctor.gradient}
                blurhash={doctor.blurhash}
                size={PHOTO}
                radius={20}
              />
            </View>
            <View style={styles.body}>
              {query ? (
                <HighlightText
                  text={doctor.name}
                  query={query}
                  numberOfLines={1}
                  style={[t.typography.cardTitle, styles.name, { color: t.colors.textPrimary }]}
                />
              ) : (
                <AppText variant="cardTitle" numberOfLines={1} style={styles.name}>
                  {doctor.name}
                </AppText>
              )}
              {query ? (
                <HighlightText
                  text={doctor.specialty}
                  query={query}
                  style={[t.typography.body, { color: t.colors.textSecondary }]}
                />
              ) : (
                <AppText color="secondary">{doctor.specialty}</AppText>
              )}
              {subtitle && query ? (
                <HighlightText
                  text={subtitle}
                  query={query}
                  numberOfLines={2}
                  style={[t.typography.small, styles.subtitle, { color: t.colors.textMuted }]}
                />
              ) : null}
              <View style={styles.meta}>
                <Ionicons name="star" size={16} color={t.colors.star} style={styles.starIcon} />
                <AppText variant="bodyMedium" style={styles.rating}>
                  {doctor.rating.toFixed(1)}
                </AppText>
                <View style={[styles.vDivider, { backgroundColor: t.colors.divider }]} />
                <AppText variant="bodyMedium">{doctor.reviewsCount}</AppText>
                <AppText color="secondary"> Reviews</AppText>
              </View>
            </View>
            <Pressable
              onPress={toggle}
              hitSlop={10}
              style={styles.bookmark}
              accessibilityRole="button"
              accessibilityLabel={
                bookmarked ? `Remove ${doctor.name} from bookmarks` : `Bookmark ${doctor.name}`
              }
              accessibilityState={{ selected: bookmarked }}
            >
              <Animated.View style={popStyle}>
                <BookmarkIcon filled={bookmarked} color={t.colors.primary} />
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

function BookmarkIcon({ filled, color }: { filled: boolean; color: string }) {
  return <Ionicons name={filled ? 'bookmark' : 'bookmark-outline'} size={20} color={color} />;
}

const styles = StyleSheet.create({
  outer: { marginBottom: 14 },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_W - 10,
    justifyContent: 'center',
  },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  photo: { width: PHOTO, height: PHOTO, borderRadius: 20, overflow: 'hidden' },
  body: { flex: 1, marginLeft: 16, paddingRight: 28 },
  name: { fontSize: 18, marginBottom: 2 },
  subtitle: { marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  starIcon: { marginRight: 4 },
  rating: { marginRight: 2 },
  vDivider: { width: 1.5, height: 16, marginHorizontal: 12 },
  bookmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
