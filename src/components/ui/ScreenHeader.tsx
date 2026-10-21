import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { CircleButton } from './CircleButton';

interface Props {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

/** Stack screen header: white circular back button + bold title. */
export function ScreenHeader({ title, right, onBack, showBack = true }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {showBack ? (
        <CircleButton
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        />
      ) : (
        <View style={styles.spacer} />
      )}
      <AppText
        variant="sectionTitle"
        style={styles.title}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title ?? ''}
      </AppText>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  title: { flex: 1, textAlign: 'center', marginHorizontal: 12 },
  spacer: { width: 52 },
});
