import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  title: string;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel?: string;
  nextLabel?: string;
}

/** "Select Date   < November 2025 >" header; also used for "Select Time   < 8 Slots >". */
export function MonthHeader({
  title,
  label,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel = 'Previous month',
  nextLabel = 'Next month',
}: Props) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <AppText variant="sectionTitle" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.nav}>
        <Pressable
          onPress={() => {
            haptics.selection();
            onPrev();
          }}
          disabled={prevDisabled}
          style={[styles.chev, prevDisabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={prevLabel}
          accessibilityState={{ disabled: !!prevDisabled }}
        >
          <Feather name="chevron-left" size={18} color={t.colors.textSecondary} />
        </Pressable>
        <Animated.View key={label} entering={FadeIn.duration(200)}>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.label}
            accessibilityLiveRegion="polite"
          >
            {label}
          </AppText>
        </Animated.View>
        <Pressable
          onPress={() => {
            haptics.selection();
            onNext();
          }}
          disabled={nextDisabled}
          style={[styles.chev, nextDisabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          accessibilityState={{ disabled: !!nextDisabled }}
        >
          <Feather name="chevron-right" size={18} color={t.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  chev: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  label: { fontSize: 14, minWidth: 40, textAlign: 'center' },
});
