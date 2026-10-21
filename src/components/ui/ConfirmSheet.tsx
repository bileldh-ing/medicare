import { StyleSheet, Text, View } from 'react-native';

import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';

import { BottomSheet } from './BottomSheet';
import { Button, type ButtonState } from './Button';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  state?: ButtonState;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep it',
  destructive,
  state = 'idle',
  onConfirm,
  onClose,
}: Props) {
  const t = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} locked={state !== 'idle'}>
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[t.typography.body, { color: t.colors.textSecondary }]}
      >
        {message}
      </Text>
      <View style={styles.actions}>
        <Button
          title={cancelLabel}
          variant="ghost"
          onPress={onClose}
          style={styles.flex}
          size="md"
        />
        <Button
          title={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          state={state}
          style={styles.flex}
          size="md"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  flex: { flex: 1 },
});
