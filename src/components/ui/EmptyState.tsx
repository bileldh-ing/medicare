import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';
import { useMotion } from '@/utils/motion';

import { Button } from './Button';
import { Illustration, type IllustrationName } from './Illustrations';

interface Props {
  illustration: IllustrationName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  illustration,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: Props) {
  const t = useTheme();
  const m = useMotion();
  return (
    <Animated.View entering={m.fadeIn()} style={[styles.wrap, compact && styles.compact]}>
      <Illustration name={illustration} size={compact ? 110 : 150} />
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[t.typography.cardTitle, styles.title, { color: t.colors.textPrimary }]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[t.typography.body, styles.msg, { color: t.colors.textSecondary }]}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} size="md" />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  compact: { paddingVertical: 16 },
  title: { marginTop: 16, textAlign: 'center' },
  msg: { marginTop: 6, textAlign: 'center' },
  action: { marginTop: 18, alignSelf: 'stretch' },
});
