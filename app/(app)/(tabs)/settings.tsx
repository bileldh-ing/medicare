import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button, type ButtonState } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/Toast';
import { APP_NAME } from '@/constants/app';
import { useAuthStore } from '@/features/auth/authStore';
import { useSettingsStore, type ThemeMode } from '@/features/settings/settingsStore';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useTabBarSpace } from '@/utils/hooks';
import { useMotion } from '@/utils/motion';

type IconName = ComponentProps<typeof Feather>['name'];
const THEME_OPTIONS = ['System', 'Light', 'Dark'] as const;
const THEME_MAP: Record<(typeof THEME_OPTIONS)[number], ThemeMode> = {
  System: 'system',
  Light: 'light',
  Dark: 'dark',
};

export default function SettingsScreen() {
  const t = useTheme();
  const m = useMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const settings = useSettingsStore(
    useShallow((s) => ({
      notifications: s.notifications,
      haptics: s.haptics,
      reducedMotion: s.reducedMotion,
      themeMode: s.themeMode,
      setSetting: s.setSetting,
    })),
  );
  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);
  const [busy, setBusy] = useState<ButtonState>('idle');
  const isGuest = !!user?.isGuest;

  const themeLabel =
    (Object.keys(THEME_MAP) as (keyof typeof THEME_MAP)[]).find(
      (k) => THEME_MAP[k] === settings.themeMode,
    ) ?? 'System';

  const runConfirm = async () => {
    setBusy('loading');
    try {
      if (confirm === 'delete') {
        await deleteAccount();
      } else {
        await signOut();
      }
    } catch {
      setBusy('idle');
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: bottom,
      }}
    >
      <AppText variant="screenTitle" accessibilityRole="header">
        Settings
      </AppText>

      <Animated.View
        entering={m.enter(0)}
        style={[
          styles.profile,
          { backgroundColor: t.colors.primary, borderRadius: t.radii.card },
          t.shadows.strong,
        ]}
      >
        <Avatar
          name={user?.name ?? 'Guest'}
          source={user?.avatarUri ?? null}
          size={64}
          borderColor="rgba(255,255,255,0.9)"
        />
        <View style={styles.flex}>
          <AppText variant="cardTitle" color="onBlue" numberOfLines={1}>
            {user?.name ?? 'Guest'}
          </AppText>
          <AppText color="onBlueMuted" numberOfLines={1}>
            {isGuest ? 'Guest mode · data kept on this device' : user?.email}
          </AppText>
        </View>
        {!isGuest ? (
          <Pressable
            onPress={() => router.push('/edit-profile')}
            style={styles.editBtn}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Feather name="edit-2" size={18} color={t.colors.primary} />
          </Pressable>
        ) : null}
      </Animated.View>

      {isGuest ? (
        <Animated.View entering={m.enter(1)} style={styles.section}>
          <Button
            title="Create a free account"
            icon="user-plus"
            onPress={() => setConfirm('logout')}
          />
          <AppText variant="caption" color="secondary" style={styles.hint}>
            Sign out of guest mode to sign up. Your guest bookings stay on this device.
          </AppText>
        </Animated.View>
      ) : null}

      <Animated.View entering={m.enter(2)}>
        <SectionTitle>Preferences</SectionTitle>
        <Group>
          <ToggleRow
            icon="bell"
            label="Appointment reminders"
            value={settings.notifications}
            onChange={(v) => settings.setSetting('notifications', v)}
          />
          <ToggleRow
            icon="smartphone"
            label="Haptic feedback"
            value={settings.haptics}
            onChange={(v) => {
              settings.setSetting('haptics', v);
              if (v) haptics.light();
            }}
          />
          <ToggleRow
            icon="wind"
            label="Reduce motion"
            value={settings.reducedMotion}
            onChange={(v) => settings.setSetting('reducedMotion', v)}
            last
          />
        </Group>
        <AppText variant="caption" color="secondary" style={styles.themeLabel}>
          Appearance
        </AppText>
        <SegmentedControl
          options={THEME_OPTIONS}
          value={themeLabel}
          onChange={(v) => settings.setSetting('themeMode', THEME_MAP[v])}
        />
      </Animated.View>

      <Animated.View entering={m.enter(3)}>
        <SectionTitle>Account</SectionTitle>
        <Group>
          {!isGuest ? (
            <>
              <LinkRow
                icon="user"
                label="Edit profile"
                onPress={() => router.push('/edit-profile')}
              />
              <LinkRow
                icon="lock"
                label="Change password"
                onPress={() => router.push('/change-password')}
              />
            </>
          ) : null}
          <LinkRow
            icon="log-out"
            label={isGuest ? 'Leave guest mode' : 'Log out'}
            onPress={() => setConfirm('logout')}
            last={isGuest}
          />
          {!isGuest ? (
            <LinkRow
              icon="trash-2"
              label="Delete account"
              danger
              onPress={() => setConfirm('delete')}
              last
            />
          ) : null}
        </Group>
      </Animated.View>

      <AppText variant="small" color="muted" style={styles.version}>
        {APP_NAME} · v1.0.0 · Local demo build
      </AppText>

      <ConfirmSheet
        visible={confirm !== null}
        title={
          confirm === 'delete' ? 'Delete your account?' : isGuest ? 'Leave guest mode?' : 'Log out?'
        }
        message={
          confirm === 'delete'
            ? 'This permanently removes your profile, appointments, bookmarks and messages from this device.'
            : 'Your account and data stay saved on this device. You can sign in again any time.'
        }
        confirmLabel={confirm === 'delete' ? 'Delete' : isGuest ? 'Leave' : 'Log out'}
        cancelLabel="Cancel"
        destructive={confirm === 'delete'}
        state={busy}
        onConfirm={runConfirm}
        onClose={() => {
          setConfirm(null);
          setBusy('idle');
        }}
      />
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <AppText variant="sectionTitle" style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </AppText>
  );
}

function Group({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: t.colors.surface, borderRadius: t.radii.card },
        t.shadows.card,
      ]}
    >
      {children}
    </View>
  );
}

function RowShell({
  icon,
  label,
  right,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.colors.divider }]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: danger ? (t.isDark ? '#3B1D24' : '#FDECEC') : t.colors.blueTint },
        ]}
      >
        <Feather name={icon} size={18} color={danger ? t.colors.error : t.colors.primary} />
      </View>
      <AppText variant="bodyMedium" style={[styles.flex, danger && { color: t.colors.error }]}>
        {label}
      </AppText>
      {right}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
  last,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <RowShell
      icon={icon}
      label={label}
      last={last}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: t.colors.primary, false: t.colors.blueTintBorder }}
          thumbColor="#fff"
          accessibilityLabel={label}
        />
      }
    />
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.6 : 1 }}>
          <RowShell
            icon={icon}
            label={label}
            danger={danger}
            last={last}
            right={<Feather name="chevron-right" size={20} color={t.colors.textMuted} />}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, marginTop: 20 },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 18 },
  hint: { marginTop: 8, textAlign: 'center' },
  sectionTitle: { marginTop: 28, marginBottom: 12 },
  group: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: { marginTop: 18, marginBottom: 8, marginLeft: 4 },
  version: { textAlign: 'center', marginTop: 28 },
});
