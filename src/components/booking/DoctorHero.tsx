import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import type { Doctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { springs } from '@/utils/motion';

export interface Origin {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  doctor: Doctor;
  height: number;
  topInset: number;
  scrollY: SharedValue<number>;
  /** 0 -> 1 progress of the flying-photo transition (1 when there is none). */
  fly: SharedValue<number>;
  reduced: boolean;
}

/** Where the flying avatar lands: roughly over the face of the cut-out. */
export function heroTarget(width: number, height: number, aspect: number) {
  const photoH = height * 0.9;
  const photoW = Math.min(width * 0.62, photoH * aspect);
  const size = photoW * 0.48;
  return { size, x: width - photoW * 0.5 - size / 2, y: height - photoH + 10 };
}

/**
 * Detail header: rating chip, big name, specialty and a large transparent cut-out
 * on the right. Parallax on scroll, pinch-to-zoom with spring back, and a
 * measured "flying photo" transition from the tapped card.
 */
export function DoctorHero({ doctor, height, topInset, scrollY, fly, reduced }: Props) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [cutoutFailed, setCutoutFailed] = useState(false);
  const pinch = useSharedValue(1);

  const photoH = height * 0.9;
  const photoW = Math.min(width * 0.62, photoH * doctor.cutoutAspect);
  const hasCutout = !!doctor.cutoutImage && !cutoutFailed;

  const pinchGesture = Gesture.Pinch()
    .onChange((e) => {
      pinch.set(Math.min(2.2, Math.max(0.9, pinch.get() * e.scaleChange)));
    })
    .onEnd(() => {
      pinch.set(withSpring(1, springs.bouncy));
    });

  const photoStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    const parallax = interpolate(y, [-200, 0, 400], [0, 0, 400 * 0.55], Extrapolation.CLAMP);
    const scale = interpolate(y, [0, 220], [1, 1.06], Extrapolation.CLAMP);
    return {
      opacity: interpolate(fly.get(), [0.35, 0.85], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: parallax + interpolate(fly.get(), [0, 1], [24, 0]) },
        { scale: scale * pinch.get() },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, 160], [1, 0.2], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.get(), [0, 300], [0, 120], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={[styles.wrap, { height }]} pointerEvents="box-none">
      <GestureDetector gesture={pinchGesture}>
        <Animated.View
          style={[styles.photo, { width: photoW, height: photoH }, photoStyle]}
          accessibilityRole="image"
          accessibilityLabel={`Photo of ${doctor.name}. Pinch to zoom.`}
        >
          {hasCutout ? (
            <Image
              source={doctor.cutoutImage ?? undefined}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              contentPosition="bottom"
              cachePolicy="memory-disk"
              transition={reduced ? 0 : 180}
              onError={() => setCutoutFailed(true)}
            />
          ) : (
            <View style={styles.fallback}>
              <Avatar
                name={doctor.name}
                source={doctor.avatarImage}
                gradient={doctor.gradient}
                size={Math.min(photoW, photoH) * 0.8}
              />
            </View>
          )}
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[styles.texts, { top: topInset + 84 }, textStyle]} pointerEvents="none">
        <View style={[styles.rating, { backgroundColor: t.colors.surface }, t.shadows.card]}>
          <Ionicons name="star" size={16} color={t.colors.star} />
          <AppText variant="bodyMedium" style={styles.ratingText}>
            {doctor.rating.toFixed(1)}
          </AppText>
        </View>
        <AppText
          variant="doctorName"
          accessibilityRole="header"
          numberOfLines={3}
          adjustsFontSizeToFit
        >
          {doctor.name}
        </AppText>
        <AppText variant="bodyMedium" color="primary" style={styles.specialty}>
          {doctor.specialty}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.exp}>
          {doctor.experienceYears} yrs experience · {doctor.reviewsCount} reviews
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  photo: { position: 'absolute', right: 0, bottom: -28 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  texts: { position: 'absolute', left: 20, width: '52%' },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 14,
  },
  ratingText: { marginLeft: 6 },
  specialty: { marginTop: 8, fontSize: 17 },
  exp: { marginTop: 6 },
});

interface FlyingProps {
  doctor: Doctor;
  origin: Origin;
  target: { size: number; x: number; y: number };
  fly: SharedValue<number>;
}

/** Custom "shared element": the tapped card photo flies to the hero, then fades into the cut-out. */
export function FlyingPhoto({ doctor, origin, target, fly }: FlyingProps) {
  const style = useAnimatedStyle(() => {
    const v = fly.get();
    const size = interpolate(v, [0, 1], [origin.w, target.size]);
    return {
      opacity: interpolate(v, [0, 0.6, 1], [1, 1, 0]),
      width: size,
      height: size,
      borderRadius: interpolate(v, [0, 1], [20, target.size / 2]),
      transform: [
        { translateX: interpolate(v, [0, 1], [origin.x, target.x]) },
        { translateY: interpolate(v, [0, 1], [origin.y, target.y]) },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[flyStyles.flying, style]}>
      <Avatar
        name={doctor.name}
        source={doctor.avatarImage}
        gradient={doctor.gradient}
        size={origin.w}
        radius={0}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const flyStyles = StyleSheet.create({
  flying: { position: 'absolute', left: 0, top: 0, overflow: 'hidden', zIndex: 50 },
});
