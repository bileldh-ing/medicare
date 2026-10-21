import { Feather } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button, type ButtonState } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/features/auth/authStore';
import { profileSchema, type ProfileValues } from '@/features/auth/schemas';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function EditProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUri ?? null);
  const [btn, setBtn] = useState<ButtonState>('idle');

  const { control, handleSubmit, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
    } catch {
      toast.error('Could not open your photos');
    }
  };

  const onSave = handleSubmit(async (v) => {
    setBtn('loading');
    try {
      await updateProfile({ name: v.name, phone: v.phone, avatarUri });
      setBtn('success');
      haptics.success();
      setTimeout(() => router.back(), 600);
    } catch (e) {
      setBtn('idle');
      toast.error(e instanceof Error ? e.message : 'Could not save profile');
    }
  });

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
        <ScreenHeader title="Edit profile" />
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={pickAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <Avatar name={user?.name ?? '?'} source={avatarUri} size={112} />
            <View
              style={[
                styles.cam,
                { backgroundColor: t.colors.primary, borderColor: t.colors.background },
              ]}
            >
              <Feather name="camera" size={16} color="#fff" />
            </View>
          </Pressable>
          {avatarUri ? (
            <Pressable onPress={() => setAvatarUri(null)} hitSlop={10} accessibilityRole="button">
              <AppText variant="caption" color="secondary" style={styles.remove}>
                Remove photo
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                icon="user"
                placeholder="Full name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.name?.message}
                accessibilityLabel="Full name"
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input
                icon="phone"
                placeholder="Phone (optional)"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.phone?.message}
                accessibilityLabel="Phone number"
              />
            )}
          />
          <Input
            icon="mail"
            value={user?.email ?? ''}
            editable={false}
            accessibilityLabel="Email, cannot be changed"
            style={{ color: t.colors.textMuted }}
          />
          <Button title="Save changes" state={btn} onPress={onSave} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  avatarWrap: { alignItems: 'center', marginTop: 16 },
  cam: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  remove: { marginTop: 10 },
  form: { marginTop: 28, gap: 16 },
});
