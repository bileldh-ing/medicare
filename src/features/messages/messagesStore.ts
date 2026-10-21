import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';
import { registerScopedStore } from '@/features/session/scopedStores';
import { createUserScopedStorage } from '@/utils/storage';

export interface ChatMessage {
  id: string;
  doctorId: string;
  from: 'me' | 'doctor';
  text: string;
  createdAt: string;
}

interface MessagesData {
  /** Messages per doctor thread, oldest first. */
  threads: Record<string, ChatMessage[]>;
  /** Last time the user opened each thread (ISO). */
  lastRead: Record<string, string>;
}

interface MessagesState extends MessagesData {
  hasHydrated: boolean;
  send: (doctorId: string, text: string) => void;
  receive: (doctorId: string, text: string) => void;
  markRead: (doctorId: string) => void;
}

const EMPTY: MessagesData = { threads: {}, lastRead: {} };
const MAX_PER_THREAD = 200;

function msg(doctorId: string, from: ChatMessage['from'], text: string): ChatMessage {
  return {
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    doctorId,
    from,
    text,
    createdAt: new Date().toISOString(),
  };
}

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hasHydrated: false,
      send: (doctorId, text) => {
        const t = text.trim();
        if (!t) return;
        const list = get().threads[doctorId] ?? [];
        set({
          threads: {
            ...get().threads,
            [doctorId]: [...list, msg(doctorId, 'me', t)].slice(-MAX_PER_THREAD),
          },
          lastRead: { ...get().lastRead, [doctorId]: new Date().toISOString() },
        });
      },
      receive: (doctorId, text) => {
        const list = get().threads[doctorId] ?? [];
        set({
          threads: {
            ...get().threads,
            [doctorId]: [...list, msg(doctorId, 'doctor', text)].slice(-MAX_PER_THREAD),
          },
        });
      },
      markRead: (doctorId) =>
        set({ lastRead: { ...get().lastRead, [doctorId]: new Date().toISOString() } }),
    }),
    {
      name: STORAGE_KEYS.messages,
      version: 1,
      storage: createUserScopedStorage<MessagesData>(),
      skipHydration: true,
      partialize: (s): MessagesData => ({ threads: s.threads, lastRead: s.lastRead }),
      migrate: (p) => {
        const d = (p ?? {}) as Partial<MessagesData>;
        return {
          threads: d.threads && typeof d.threads === 'object' ? d.threads : {},
          lastRead: d.lastRead && typeof d.lastRead === 'object' ? d.lastRead : {},
        };
      },
      onRehydrateStorage: () => () => useMessagesStore.setState({ hasHydrated: true }),
    },
  ),
);

registerScopedStore({
  name: 'messages',
  reset: () => useMessagesStore.setState({ ...EMPTY, hasHydrated: false }),
  rehydrate: () => useMessagesStore.persist.rehydrate(),
});

/** Canned demo replies so the local chat feels alive. */
export function demoReply(text: string): string {
  const t = text.toLowerCase();
  if (/(resched|move|change).*(appointment|time)/.test(t))
    return 'Of course. You can pick a new time from the Appointments tab with Re-Schedule.';
  if (/(pain|hurt|fever|bleed|emergency)/.test(t))
    return 'Thanks for letting me know. If this is urgent, please call your local emergency number right away.';
  if (/(thank|thanks)/.test(t)) return "You're welcome! See you at your appointment.";
  return 'Thanks for your message. I will review it before our appointment. (Demo reply)';
}
