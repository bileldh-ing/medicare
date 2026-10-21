import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Illustration, type IllustrationName } from '@/components/ui/Illustrations';
import { PressableScale } from '@/components/ui/PressableScale';
import { APP_NAME } from '@/constants/app';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useTheme } from '@/theme';

const SLIDES: { title: string; body: string; art: IllustrationName }[] = [
  {
    title: 'Find trusted doctors',
    body: 'Browse top-rated specialists from cardiology to dentistry and search by name or need.',
    art: 'heart',
  },
  {
    title: 'Book in a few taps',
    body: 'Pick a day, choose a free slot and confirm. Re-schedule or cancel any time.',
    art: 'calendar',
  },
  {
    title: 'Stay in touch',
    body: 'Message the doctors you booked and get reminders before each visit.',
    art: 'chat',
  },
];

/** First launch only: 3 skippable slides. */
export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const setSetting = useSettingsStore((s) => s.setSetting);
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);

  const finish = () => {
    setSetting('onboardingSeen', true);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <View style={styles.top}>
        <AppText variant="cardTitle" color="accent">
          {APP_NAME}
        </AppText>
        <PressableScale
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={styles.skip}
        >
          <AppText variant="bodyMedium" color="secondary">
            Skip
          </AppText>
        </PressableScale>
      </View>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <Illustration name={s.art} size={Math.min(260, width * 0.65)} />
            <AppText variant="hero" style={styles.title} accessibilityRole="header">
              {s.title}
            </AppText>
            <AppText color="secondary" style={styles.body}>
              {s.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={[
                styles.dot,
                {
                  width: i === page ? 22 : 8,
                  backgroundColor: i === page ? t.colors.primary : t.colors.blueTintBorder,
                },
              ]}
            />
          ))}
        </View>
        <Button
          title={page === SLIDES.length - 1 ? 'Get started' : 'Next'}
          onPress={() => {
            if (page === SLIDES.length - 1) finish();
            else {
              ref.current?.scrollTo({ x: (page + 1) * width, animated: true });
              setPage(page + 1);
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 56,
  },
  skip: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: { textAlign: 'center', marginTop: 32 },
  body: { textAlign: 'center', marginTop: 12, fontSize: 16 },
  bottom: { paddingHorizontal: 20, paddingBottom: 16, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { height: 8, borderRadius: 4 },
});
