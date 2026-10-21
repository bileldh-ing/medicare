import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AuthScaffold } from '@/components/common/AuthScaffold';
import { AppText } from '@/components/ui/AppText';
import { Button, type ButtonState } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { authService } from '@/features/auth/authClient';
import { AuthError } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useMotion } from '@/utils/motion';

export default function LoginScreen() {
  const router = useRouter();
  const t = useTheme();
  const m = useMotion();
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);
  const signIn = useAuthStore((s) => s.signIn);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [btn, setBtn] = useState<ButtonState>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(
    () => authService.getLockState().lockedUntil,
  );
  const [now, setNow] = useState(() => Date.now());
  const [guestBusy, setGuestBusy] = useState(false);

  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
    mode: 'onTouched',
  });

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const locked = secondsLeft > 0;

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setFormError(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  if (!onboardingSeen) return <Redirect href="/onboarding" />;

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      setBtn('loading');
      try {
        await signIn(
          { email: values.email, password: values.password, remember: values.remember },
          {
            onVerified: () => (setBtn('success'), haptics.success()),
            commitDelayMs: m.reduced ? 0 : 550,
          },
        );
      } catch (e) {
        setBtn('idle');
        haptics.error();
        setShake((s) => s + 1);
        if (e instanceof AuthError && e.code === 'LOCKED' && e.retryAt) {
          setLockedUntil(e.retryAt);
          setFormError('Too many failed attempts.');
        } else {
          setFormError('Incorrect email or password');
        }
      }
    },
    () => {
      haptics.error();
      setShake((s) => s + 1);
    },
  );

  return (
    <AuthScaffold
      title="Welcome back"
      subtitle="Sign in to manage your appointments"
      footer={
        <View style={styles.footerRow}>
          <AppText color="secondary">Don&apos;t have an account? </AppText>
          <Pressable onPress={() => router.push('/signup')} accessibilityRole="link" hitSlop={10}>
            <AppText variant="bodyMedium" color="accent">
              Sign Up
            </AppText>
          </Pressable>
        </View>
      }
    >
      <Animated.View entering={m.enter(3)}>
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
              textContentType="emailAddress"
              autoCorrect={false}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.email?.message}
              shakeKey={shake}
              accessibilityLabel="Email address"
              returnKeyType="next"
            />
          )}
        />
      </Animated.View>
      <Animated.View entering={m.enter(4)}>
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <PasswordInput
              placeholder="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.password?.message}
              shakeKey={shake}
              accessibilityLabel="Password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
      </Animated.View>
      <Animated.View entering={m.enter(5)} style={styles.row}>
        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              accessibilityLabel="Remember me for 30 days"
              label={<AppText color="secondary">Remember me</AppText>}
            />
          )}
        />
        <Pressable
          onPress={() => router.push('/forgot-password')}
          accessibilityRole="link"
          hitSlop={10}
        >
          <AppText variant="bodyMedium" color="accent">
            Forgot password?
          </AppText>
        </Pressable>
      </Animated.View>

      {formError ? (
        <View
          style={[styles.banner, { backgroundColor: t.isDark ? '#3B1D24' : '#FDECEC' }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <AppText variant="bodyMedium" color="error">
            {formError}
            {locked ? ` Try again in ${secondsLeft}s.` : ''}
          </AppText>
        </View>
      ) : null}

      <Animated.View entering={m.enter(6)}>
        <Button
          title={locked ? `Locked · ${secondsLeft}s` : 'Sign In'}
          state={btn}
          disabled={locked}
          onPress={onSubmit}
          testID="sign-in"
        />
      </Animated.View>

      <Animated.View entering={m.enter(7)} style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: t.colors.divider }]} />
        <AppText variant="caption" color="muted" style={styles.or}>
          or
        </AppText>
        <View style={[styles.line, { backgroundColor: t.colors.divider }]} />
      </Animated.View>
      <Animated.View entering={m.enter(8)}>
        <Button
          title="Continue as guest"
          variant="ghost"
          state={guestBusy ? 'loading' : 'idle'}
          accessibilityHint="Browse and book without an account. Bookings are kept on this device."
          onPress={async () => {
            setGuestBusy(true);
            try {
              await continueAsGuest();
            } catch {
              setGuestBusy(false);
            }
          }}
        />
      </Animated.View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  banner: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 1 },
  or: { marginHorizontal: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
});
