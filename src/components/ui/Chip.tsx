import { Feather } from '@expo/vector-icons';
import { memo, type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Feather>['name'];
  /** Transparent background, used when a shared animated pill sits behind the chip. */
  transparent?: boolean;
  accessibilityHint?: string;
}

export const Chip = memo(function Chip({
  label,
  selected,
  onPress,
  icon,
  transparent,
  accessibilityHint,
}: Props) {
  const t = useTheme();
  const fg = selected ? t.colors.textOnBlue : t.colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      haptic={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        {
          borderRadius: t.radii.chip,
          backgroundColor: transparent
            ? 'transparent'
            : selected
              ? t.colors.primary
              : t.colors.blueTint,
        },
      ]}
    >
      {icon ? <Feather name={icon} size={14} color={fg} style={styles.icon} /> : null}
      <AppText variant="bodyMedium" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { marginRight: 6 },
});
