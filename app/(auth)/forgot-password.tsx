import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AuthScaffold } from '@/components/common/AuthScaffold';
import { StrengthMeter } from '@/components/common/StrengthMeter';
import { AppText } from '@/components/ui/AppText';
import { Button, type ButtonState } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { toast } from '@/components/ui/Toast';
import { authService } from '@/features/auth/authClient';
import {
  forgotEmailSchema,
  resetPasswordSchema,
  type ForgotEmailValues,
  type ResetPasswordValues,
} from '@/features/auth/schemas';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useMotion } from '@/utils/motion';

/** LOCAL DEMO flow: no email is sent; if the account exists on this device you can set a new password. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const t = useTheme();
  const m = useMotion();
  const [email, setEmail] = useState<string | null>(null);
  const [btn, setBtn] = useState<ButtonState>('idle');

  const emailForm = useForm<ForgotEmailValues>({
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const newPassword = useWatch({ control: resetForm.control, name: 'password' });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  const checkEmail = emailForm.handleSubmit(async ({ email: value }) => {
    setBtn('loading');
    const exists = await authService.emailExists(value);
    setBtn('idle');
    if (!exists) {
      haptics.error();
      emailForm.setError('email', { message: 'No account on this device uses that email' });
      return;
    }
    setEmail(value);
  });

  const reset = resetForm.handleSubmit(async ({ password }) => {
    if (!email) return;
    setBtn('loading');
    try {
      await authService.resetPassword(email, password);
      setBtn('success');
      haptics.success();
      toast.success('Password updated. Sign in with your new password.');
      setTimeout(back, 700);
    } catch (e) {
      setBtn('idle');
      toast.error(e instanceof Error ? e.message : 'Could not reset password');
    }
  });

  return (
    <AuthScaffold
      title={email ? 'New password' : 'Forgot password'}
      subtitle={email ? `Set a new password for ${email}` : 'Enter the email you signed up with'}
      onBack={back}
    >
      <View style={[styles.demo, { backgroundColor: t.colors.blueTint }]} accessible>
        <Feather name="info" size={18} color={t.colors.primary} />
        <AppText variant="caption" color="accent" style={styles.demoText}>
          Local demo flow: accounts live only on this device, so no reset email is sent.
        </AppText>
      </View>
      {!email ? (
        <>
          <Animated.View entering={m.enter(3)}>
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <Input
                  icon="mail"
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={emailForm.formState.errors.email?.message}
                  accessibilityLabel="Email address"
                />
              )}
            />
          </Animated.View>
          <Button title="Continue" state={btn} onPress={checkEmail} />
        </>
      ) : (
        <>
          <Controller
            control={resetForm.control}
            name="password"
            render={({ field }) => (
              <PasswordInput
                placeholder="New password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={resetForm.formState.errors.password?.message}
                accessibilityLabel="New password"
              />
            )}
          />
          <StrengthMeter password={newPassword} />
          <Controller
            control={resetForm.control}
            name="confirm"
            render={({ field }) => (
              <PasswordInput
                placeholder="Confirm new password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={resetForm.formState.errors.confirm?.message}
                accessibilityLabel="Confirm new password"
              />
            )}
          />
          <Button title="Update password" state={btn} onPress={reset} />
        </>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  demo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  demoText: { flex: 1 },
});
