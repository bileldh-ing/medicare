import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StrengthMeter } from '@/components/common/StrengthMeter';
import { Button, type ButtonState } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { toast } from '@/components/ui/Toast';
import { AuthError } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function ChangePasswordScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const changePassword = useAuthStore((s) => s.changePassword);
  const [btn, setBtn] = useState<ButtonState>('idle');
  const [shake, setShake] = useState(0);

  const { control, handleSubmit, formState, setError } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setBtn('loading');
    try {
      await changePassword(v.current, v.next);
      setBtn('success');
      haptics.success();
      toast.success('Password changed');
      setTimeout(() => router.back(), 600);
    } catch (e) {
      setBtn('idle');
      haptics.error();
      setShake((s) => s + 1);
      if (e instanceof AuthError && e.code === 'WRONG_PASSWORD')
        setError('current', { message: e.message });
      else toast.error(e instanceof Error ? e.message : 'Could not change password');
    }
  });

  const e = formState.errors;
  const nextPassword = useWatch({ control, name: 'next' });
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Change password" />
        <View style={styles.form}>
          <Controller
            control={control}
            name="current"
            render={({ field }) => (
              <PasswordInput
                placeholder="Current password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={e.current?.message}
                shakeKey={e.current ? shake : 0}
                accessibilityLabel="Current password"
              />
            )}
          />
          <Controller
            control={control}
            name="next"
            render={({ field }) => (
              <PasswordInput
                placeholder="New password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={e.next?.message}
                accessibilityLabel="New password"
                textContentType="newPassword"
              />
            )}
          />
          <StrengthMeter password={nextPassword} />
          <Controller
            control={control}
            name="confirm"
            render={({ field }) => (
              <PasswordInput
                placeholder="Confirm new password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={e.confirm?.message}
                accessibilityLabel="Confirm new password"
              />
            )}
          />
          <Button title="Update password" state={btn} onPress={onSubmit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { marginTop: 24, gap: 16 },
});
