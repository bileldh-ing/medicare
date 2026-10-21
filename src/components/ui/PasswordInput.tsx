import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Input, type InputProps } from './Input';

/** Password field with show/hide eye toggle. */
export function PasswordInput(props: Omit<InputProps, 'secureTextEntry' | 'right'>) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  return (
    <Input
      icon="lock"
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      {...props}
      secureTextEntry={!visible}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Feather name={visible ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
