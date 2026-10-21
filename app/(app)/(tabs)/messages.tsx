import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';
import { formatRelativeShort } from '@/features/appointments/dateUtils';
import { getDoctor, type Doctor } from '@/features/doctors/doctors';
import { useMessagesStore, type ChatMessage } from '@/features/messages/messagesStore';
import { useTheme } from '@/theme';
import { useTabBarSpace } from '@/utils/hooks';
import { useMotion } from '@/utils/motion';

interface Thread {
  doctor: Doctor;
  last?: ChatMessage;
  unread: number;
}

/** Threads with every doctor the user has booked (plus any existing chat). */
export default function MessagesScreen() {
  const t = useTheme();
  const m = useMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const appointments = useAppointmentsStore((s) => s.appointments);
  const threads = useMessagesStore((s) => s.threads);
  const lastRead = useMessagesStore((s) => s.lastRead);

  const data = useMemo<Thread[]>(() => {
    const ids = new Set<string>([...appointments.map((a) => a.doctorId), ...Object.keys(threads)]);
    return [...ids]
      .map((id): Thread | null => {
        const doctor = getDoctor(id);
        if (!doctor) return null;
        const list = threads[id] ?? [];
        const last = list[list.length - 1];
        const readAt = lastRead[id] ? new Date(lastRead[id]!).getTime() : 0;
        const unread = list.filter(
          (msg) => msg.from === 'doctor' && new Date(msg.createdAt).getTime() > readAt,
        ).length;
        return last ? { doctor, last, unread } : { doctor, unread };
      })
      .filter((x): x is Thread => !!x)
      .sort((a, b) => (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? ''));
  }, [appointments, threads, lastRead]);

  const renderItem = useCallback(
    ({ item, index }: { item: Thread; index: number }) => (
      <Animated.View entering={m.enter(Math.min(index, 6))}>
        <PressableScale
          onPress={() =>
            router.push({ pathname: '/chat/[doctorId]', params: { doctorId: item.doctor.id } })
          }
          style={[
            styles.row,
            { backgroundColor: t.colors.surface, borderRadius: t.radii.card },
            t.shadows.card,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Chat with ${item.doctor.name}${item.unread ? `, ${item.unread} unread` : ''}`}
        >
          <Avatar
            name={item.doctor.name}
            source={item.doctor.avatarImage}
            gradient={item.doctor.gradient}
            size={56}
          />
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <AppText variant="cardTitle" numberOfLines={1} style={styles.flex}>
                {item.doctor.name}
              </AppText>
              {item.last ? (
                <AppText variant="small" color="muted">
                  {formatRelativeShort(item.last.createdAt)}
                </AppText>
              ) : null}
            </View>
            <View style={styles.titleRow}>
              <AppText color="secondary" numberOfLines={1} style={styles.flex}>
                {item.last
                  ? `${item.last.from === 'me' ? 'You: ' : ''}${item.last.text}`
                  : `Say hello to your ${item.doctor.specialty.toLowerCase()} doctor`}
              </AppText>
              {item.unread ? (
                <View style={[styles.badge, { backgroundColor: t.colors.primary }]}>
                  <AppText variant="small" color="onBlue">
                    {item.unread}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    ),
    [m, router, t],
  );

  return (
    <View
      style={[styles.flex, { backgroundColor: t.colors.background, paddingTop: insets.top + 12 }]}
    >
      <AppText variant="screenTitle" style={styles.title} accessibilityRole="header">
        Messages
      </AppText>
      <FlashList
        data={data}
        keyExtractor={(x) => x.doctor.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: bottom }}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <EmptyState
            illustration="chat"
            title="No conversations yet"
            message="After you book a doctor you can message them here."
            actionLabel="Find a doctor"
            onAction={() => router.push({ pathname: '/search', params: { all: '1' } })}
          />
        }
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sep: { height: 12 },
});
