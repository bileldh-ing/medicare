import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AuthScaffold } from '@/components/common/AuthScaffold';
import { StrengthMeter } from '@/components/common/StrengthMeter';
import { AppText } from '@/components/ui/AppText';
import { Button, type ButtonState } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { toast } from '@/components/ui/Toast';
import { AuthError } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { signupSchema, type SignupValues } from '@/features/auth/schemas';
import { haptics } from '@/utils/haptics';
import { useMotion } from '@/utils/motion';

export default function SignupScreen() {
  const router = useRouter();
  const m = useMotion();
  const signUp = useAuthStore((s) => s.signUp);
  const [btn, setBtn] = useState<ButtonState>('idle');
  const [shake, setShake] = useState(0);

  const { control, handleSubmit, formState, setError } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirm: '', terms: false },
    mode: 'onTouched',
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(
    async (v) => {
      setBtn('loading');
      try {
        await signUp(
          { name: v.name, email: v.email, phone: v.phone, password: v.password },
          {
            onVerified: () => (setBtn('success'), haptics.success()),
            commitDelayMs: m.reduced ? 0 : 600,
          },
        );
      } catch (e) {
        setBtn('idle');
        haptics.error();
        setShake((s) => s + 1);
        if (e instanceof AuthError && e.code === 'EMAIL_TAKEN') {
          setError('email', { message: 'This email is already registered' });
        } else {
          toast.error(e instanceof Error ? e.message : 'Could not create your account');
        }
      }
    },
    () => {
      haptics.error();
      setShake((s) => s + 1);
    },
  );

  const e = formState.errors;

  return (
    <AuthScaffold
      title="Create account"
      subtitle="Book trusted doctors in a few taps"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      footer={
        <View style={styles.footerRow}>
          <AppText color="secondary">Already have an account? </AppText>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            accessibilityRole="link"
            hitSlop={10}
          >
            <AppText variant="bodyMedium" color="accent">
              Sign In
            </AppText>
          </Pressable>
        </View>
      }
    >
      <Animated.View entering={m.enter(3)}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              icon="user"
              placeholder="Full name"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e.name?.message}
              shakeKey={e.name ? shake : 0}
              accessibilityLabel="Full name"
            />
          )}
        />
      </Animated.View>
      <Animated.View entering={m.enter(4)}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              icon="mail"
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e.email?.message}
              shakeKey={e.email ? shake : 0}
              accessibilityLabel="Email address"
            />
          )}
        />
      </Animated.View>
      <Animated.View entering={m.enter(5)}>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              icon="phone"
              placeholder="Phone (optional)"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e.phone?.message}
              accessibilityLabel="Phone number, optional"
            />
          )}
        />
      </Animated.View>
      <Animated.View entering={m.enter(6)}>
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <PasswordInput
              placeholder="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e.password?.message}
              shakeKey={e.password ? shake : 0}
              accessibilityLabel="Password, at least 8 characters with a letter and a number"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
      </Animated.View>
      <StrengthMeter password={password} />
      <Animated.View entering={m.enter(7)}>
        <Controller
          control={control}
          name="confirm"
          render={({ field }) => (
            <PasswordInput
              placeholder="Confirm password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e.confirm?.message}
              shakeKey={e.confirm ? shake : 0}
              accessibilityLabel="Confirm password"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
      </Animated.View>
      <Animated.View entering={m.enter(8)}>
        <Controller
          control={control}
          name="terms"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              error={!!e.terms}
              accessibilityLabel="I agree to the Terms and Privacy Policy"
              label={
                <AppText color="secondary">
                  I agree to the <AppText color="accent">Terms</AppText> and{' '}
                  <AppText color="accent">Privacy Policy</AppText>
                </AppText>
              }
            />
          )}
        />
        {e.terms ? (
          <AppText
            variant="caption"
            color="error"
            style={styles.termsErr}
            accessibilityRole="alert"
          >
            {e.terms.message}
          </AppText>
        ) : null}
      </Animated.View>
      <Animated.View entering={m.enter(9)}>
        <Button title="Create Account" state={btn} onPress={onSubmit} />
      </Animated.View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  termsErr: { marginLeft: 32 },
});
