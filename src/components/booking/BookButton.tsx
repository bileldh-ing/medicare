import { StyleSheet, View } from 'react-native';

import { Button, type ButtonState } from '@/components/ui/Button';

import { Confetti } from './Confetti';

interface Props {
  title: string;
  state: ButtonState;
  burstKey: number;
  onPress: () => void;
  disabled?: boolean;
}

/** Wide blue "Book an Appointment": loading ring, self-drawing check, confetti burst. */
export function BookButton({ title, state, burstKey, onPress, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Button
        title={title}
        state={state}
        onPress={onPress}
        disabled={disabled}
        accessibilityHint="Opens a confirmation sheet"
      />
      <Confetti burstKey={burstKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
