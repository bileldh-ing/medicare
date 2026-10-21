import { Feather, Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { APP_NAME } from '@/constants/app';
import type { Doctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  doctor: Doctor | null;
  bookmarked: boolean;
  onClose: () => void;
  onBook: (d: Doctor) => void;
  onViewProfile: (d: Doctor) => void;
  onToggleBookmark: (d: Doctor) => void;
}

export function shareDoctor(d: Doctor) {
  Share.share({
    message: `${d.name} (${d.specialty}, rated ${d.rating}) on ${APP_NAME}. Book an appointment in a few taps.`,
  }).catch(() => undefined);
}

/** Long-press quick actions: Book now, View profile, Bookmark, Share. */
export function QuickActionsSheet({
  doctor,
  bookmarked,
  onClose,
  onBook,
  onViewProfile,
  onToggleBookmark,
}: Props) {
  const t = useTheme();
  return (
    <BottomSheet visible={!!doctor} onClose={onClose}>
      {doctor ? (
        <View>
          <View style={styles.head}>
            <Avatar
              name={doctor.name}
              source={doctor.avatarImage}
              gradient={doctor.gradient}
              size={52}
            />
            <View style={styles.flex}>
              <AppText variant="cardTitle">{doctor.name}</AppText>
              <AppText color="secondary">{doctor.specialty}</AppText>
            </View>
          </View>
          <Row icon="calendar" label="Book now" onPress={() => (onClose(), onBook(doctor))} />
          <Row
            icon="user"
            label="View profile"
            onPress={() => (onClose(), onViewProfile(doctor))}
          />
          <Row
            ionicon={bookmarked ? 'bookmark' : 'bookmark-outline'}
            label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            onPress={() => {
              haptics.success();
              onToggleBookmark(doctor);
              onClose();
            }}
          />
          <Row icon="share-2" label="Share" onPress={() => (onClose(), shareDoctor(doctor))} />
          <View style={[styles.sep, { backgroundColor: t.colors.divider }]} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Row({
  icon,
  ionicon,
  label,
  onPress,
}: {
  icon?: ComponentProps<typeof Feather>['name'];
  ionicon?: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? t.colors.blueTint : 'transparent' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.icon, { backgroundColor: t.colors.blueTint }]}>
        {ionicon ? (
          <Ionicons name={ionicon} size={20} color={t.colors.primary} />
        ) : (
          <Feather name={icon ?? 'circle'} size={20} color={t.colors.primary} />
        )}
      </View>
      <AppText variant="bodyMedium">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 0 },
});
