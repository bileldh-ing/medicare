import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { CircleButton } from '@/components/ui/CircleButton';
import { APP_NAME } from '@/constants/app';
import { useTheme } from '@/theme';
import { useMotion } from '@/utils/motion';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}

/** Keyboard-aware, safe-area auth layout with a staggered heading entrance. */
export function AuthScaffold({ title, subtitle, children, footer, onBack }: Props) {
  const t = useTheme();
  const m = useMotion();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: t.colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            {onBack ? (
              <CircleButton icon="arrow-left" accessibilityLabel="Go back" onPress={onBack} />
            ) : (
              <Animated.View entering={m.enter(0)} style={styles.brand}>
                <View style={[styles.logo, { backgroundColor: t.colors.primary }]}>
                  <AppText variant="sectionTitle" color="onBlue">
                    +
                  </AppText>
                </View>
                <AppText variant="cardTitle" color="accent">
                  {APP_NAME}
                </AppText>
              </Animated.View>
            )}
          </View>
          <Animated.View entering={m.enter(1)}>
            <AppText variant="screenTitle" accessibilityRole="header">
              {title}
            </AppText>
          </Animated.View>
          <Animated.View entering={m.enter(2)}>
            <AppText color="secondary" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </Animated.View>
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  topRow: { minHeight: 56, justifyContent: 'center', marginTop: 8, marginBottom: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subtitle: { marginTop: 8, fontSize: 16 },
  body: { marginTop: 32, gap: 16 },
  footer: { marginTop: 'auto', paddingTop: 28, alignItems: 'center' },
});
