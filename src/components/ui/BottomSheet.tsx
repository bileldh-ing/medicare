import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';
import { springs, useIsReducedMotion } from '@/utils/motion';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Prevent dismiss by backdrop/drag (e.g. while saving). */
  locked?: boolean;
}

/** Modal bottom sheet: spring slide-up, backdrop fade, drag down to dismiss. */
export function BottomSheet({ visible, onClose, title, children, locked }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useIsReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);

  // Mount immediately when opened (state adjusted during render, no effect cascade).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      y.set(height);
      y.set(reduced ? withTiming(0, { duration: 1 }) : withSpring(0, springs.sheet));
    } else if (mounted) {
      y.set(
        withTiming(height, { duration: reduced ? 1 : 220 }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .enabled(!locked)
    .activeOffsetY(8)
    .onChange((e) => {
      y.set(Math.max(0, y.get() + e.changeY));
    })
    .onEnd((e) => {
      if (y.get() > 120 || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        y.set(withSpring(0, springs.sheet));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, height], [1, 0]),
  }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={locked ? undefined : onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.overlay }, backdropStyle]}
          >
            <Pressable
              style={styles.flex}
              onPress={locked ? undefined : onClose}
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
            />
          </Animated.View>
          <View style={styles.flex} pointerEvents="box-none" />
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.colors.surface,
                borderTopLeftRadius: t.radii.sheet,
                borderTopRightRadius: t.radii.sheet,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
              sheetStyle,
            ]}
            accessibilityViewIsModal
          >
            <GestureDetector gesture={pan}>
              <View style={styles.handleArea}>
                <View style={[styles.handle, { backgroundColor: t.colors.blueTintBorder }]} />
                {title ? (
                  <Text
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                    style={[
                      t.typography.sectionTitle,
                      styles.title,
                      { color: t.colors.textPrimary },
                    ]}
                    accessibilityRole="header"
                  >
                    {title}
                  </Text>
                ) : null}
              </View>
            </GestureDetector>
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { paddingHorizontal: 20 },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 44, height: 5, borderRadius: 3 },
  title: { marginTop: 14, alignSelf: 'flex-start' },
  content: { paddingTop: 8 },
});
