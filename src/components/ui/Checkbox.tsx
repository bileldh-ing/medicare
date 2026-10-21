import { Feather } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs } from '@/utils/motion';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  accessibilityLabel: string;
  error?: boolean;
}

export function Checkbox({ checked, onChange, label, accessibilityLabel, error }: Props) {
  const t = useTheme();
  const s = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    s.set(withSpring(checked ? 1 : 0, springs.bouncy));
  }, [checked, s]);
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }], opacity: s.get() }));

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onChange(!checked);
      }}
      style={styles.row}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: error
              ? t.colors.error
              : checked
                ? t.colors.primary
                : t.colors.blueTintBorder,
            backgroundColor: checked ? t.colors.primary : t.colors.surface,
          },
        ]}
      >
        <Animated.View style={tick}>
          <Feather name="check" size={14} color="#fff" />
        </Animated.View>
      </View>
      <View style={styles.label}>{label}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginLeft: 10, flexShrink: 1 },
});
