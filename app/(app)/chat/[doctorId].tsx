import { Feather } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatSlotLabel } from '@/features/appointments/dateUtils';
import { getDoctor } from '@/features/doctors/doctors';
import { demoReply, useMessagesStore, type ChatMessage } from '@/features/messages/messagesStore';
import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

const EMPTY: ChatMessage[] = [];

/** Minimal local chat; messages persist per user in AsyncStorage. */
export default function ChatScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const doctor = getDoctor(doctorId);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const messages = useMessagesStore((s) => (doctorId ? (s.threads[doctorId] ?? EMPTY) : EMPTY));
  const send = useMessagesStore((s) => s.send);
  const receive = useMessagesStore((s) => s.receive);
  const markRead = useMessagesStore((s) => s.markRead);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlashListRef<ChatMessage>>(null);

  useEffect(() => {
    if (doctorId) markRead(doctorId);
  }, [doctorId, messages.length, markRead]);

  useEffect(() => {
    const id = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length]);

  if (!doctor || !doctorId) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 40 }]}>
        <EmptyState illustration="chat" title="Conversation not found" />
      </View>
    );
  }

  const onSend = () => {
    const v = text.trim();
    if (!v) return;
    haptics.light();
    send(doctorId, v);
    setText('');
    setTyping(true);
    setTimeout(() => {
      receive(doctorId, demoReply(v));
      setTyping(false);
    }, 1200);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader
          title={doctor.name}
          right={
            <Avatar
              name={doctor.name}
              source={doctor.avatarImage}
              gradient={doctor.gradient}
              size={52}
            />
          }
        />
      </View>
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            illustration="chat"
            title={`Message ${doctor.name}`}
            message="Ask a question before your visit. Replies in this demo are automatic."
            compact
          />
        }
        ListFooterComponent={
          typing ? (
            <AppText variant="caption" color="muted" style={styles.typing}>
              {doctor.name} is typing…
            </AppText>
          ) : null
        }
        renderItem={({ item }) => {
          const mine = item.from === 'me';
          return (
            <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: t.colors.primary, borderBottomRightRadius: 6 }
                    : { backgroundColor: t.colors.surface, borderBottomLeftRadius: 6 },
                ]}
                accessible
                accessibilityLabel={`${mine ? 'You' : doctor.name}: ${item.text}`}
              >
                <AppText color={mine ? 'onBlue' : 'primary'}>{item.text}</AppText>
                <AppText variant="small" color={mine ? 'onBlueMuted' : 'muted'} style={styles.time}>
                  {formatSlotLabel(new Date(item.createdAt))}
                </AppText>
              </View>
            </View>
          );
        }}
      />
      <View
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.colors.surface },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message…"
          placeholderTextColor={t.colors.textMuted}
          style={[
            styles.input,
            t.typography.body,
            { color: t.colors.textPrimary, backgroundColor: t.colors.background },
          ]}
          multiline
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel="Message"
        />
        <Pressable
          onPress={onSend}
          disabled={!text.trim()}
          style={[
            styles.send,
            { backgroundColor: t.colors.primary, opacity: text.trim() ? 1 : 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Feather name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingVertical: 12 },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  time: { marginTop: 4, alignSelf: 'flex-end' },
  typing: { marginLeft: 8, marginTop: 6 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
