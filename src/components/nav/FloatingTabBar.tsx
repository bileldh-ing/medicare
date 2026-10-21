import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { memo, useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs, useIsReducedMotion } from '@/utils/motion';

type IconName = ComponentProps<typeof Feather>['name'];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  appointments: { label: 'Bookings', icon: 'calendar' },
  messages: { label: 'Messages', icon: 'mail' },
  settings: { label: 'Settings', icon: 'settings' },
};

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM = 14;
const ACTIVE_W = 128;
const PAD = 8;

interface ItemProps {
  label: string;
  icon: IconName;
  active: boolean;
  width: number;
  onPress: () => void;
  reduced: boolean;
}

const TabItem = memo(function TabItem({ label, icon, active, width, onPress, reduced }: ItemProps) {
  const t = useTheme();
  const w = useSharedValue(width);
  const labelProgress = useSharedValue(active ? 1 : 0);
  const bounce = useSharedValue(1);

  useEffect(() => {
    w.set(reduced ? width : withSpring(width, springs.gentle));
  }, [width, reduced, w]);

  useEffect(() => {
    labelProgress.set(withTiming(active ? 1 : 0, { duration: active ? 260 : 120 }));
    if (active && !reduced) {
      bounce.set(withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, springs.bouncy)));
    }
  }, [active, reduced, labelProgress, bounce]);

  const itemStyle = useAnimatedStyle(() => ({ width: w.get() }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.get() }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelProgress.get(),
    transform: [{ translateX: (1 - labelProgress.get()) * -8 }],
  }));

  return (
    <Animated.View style={itemStyle}>
      <Pressable
        onPress={onPress}
        style={styles.item}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        <Animated.View style={iconStyle}>
          <Feather
            name={icon}
            size={22}
            color={active ? t.colors.textOnBlue : t.colors.inactiveIcon}
          />
        </Animated.View>
        {active ? (
          <Animated.View style={labelStyle}>
            <AppText
              variant="bodyMedium"
              color="onBlue"
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              style={styles.label}
            >
              {label}
            </AppText>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

/**
 * Floating pill tab bar. The active tab expands into a blue pill (icon + label)
 * that glides with a spring between tabs; inactive tabs show only the icon.
 */
export function FloatingTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const t = useTheme();
  const reduced = useIsReducedMotion();
  const [barW, setBarW] = useState(0);
  const count = state.routes.length;
  const inner = Math.max(0, barW - PAD * 2);
  const inactiveW = count > 1 ? (inner - ACTIVE_W) / (count - 1) : inner;
  const pillX = useSharedValue(0);

  useEffect(() => {
    const x = state.index * inactiveW;
    pillX.set(reduced ? x : withSpring(x, springs.gentle));
  }, [state.index, inactiveW, reduced, pillX]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.get() }] }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 0) + TAB_BAR_BOTTOM }]}
    >
      <View
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
        style={[
          styles.bar,
          { backgroundColor: t.colors.tabBar, borderRadius: t.radii.tabBar },
          t.shadows.soft,
        ]}
        accessibilityRole="tablist"
      >
        {barW > 0 ? (
          <>
            <Animated.View
              style={[
                styles.pill,
                {
                  width: ACTIVE_W,
                  backgroundColor: t.colors.primary,
                  borderRadius: t.radii.tabBar,
                },
                pillStyle,
              ]}
            />
            {state.routes.map((route, i) => {
              const meta = TABS[route.name] ?? { label: route.name, icon: 'circle' as IconName };
              const active = i === state.index;
              return (
                <TabItem
                  key={route.key}
                  label={meta.label}
                  icon={meta.icon}
                  active={active}
                  width={active ? ACTIVE_W : inactiveW}
                  reduced={reduced}
                  onPress={() => {
                    if (!active) {
                      haptics.selection();
                      navigateToTab(route.key);
                    }
                  }}
                />
              );
            })}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
  },
  pill: { position: 'absolute', left: PAD, top: PAD, bottom: PAD },
  item: {
    height: TAB_BAR_HEIGHT - PAD * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: { fontSize: 15 },
});
