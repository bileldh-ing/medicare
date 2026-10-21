/** Single place for the product name (placeholder brand). */
export const APP_NAME = 'MediCare';

/** Storage key prefix used by every AsyncStorage key in the app. */
export const STORAGE_PREFIX = '@medicare';

export const STORAGE_KEYS = {
  users: `${STORAGE_PREFIX}/users`,
  settings: `${STORAGE_PREFIX}/settings`,
  guestId: `${STORAGE_PREFIX}/guestId`,
  /** Per-user namespaces: the final key is `${base}/${userId}`. */
  appointments: `${STORAGE_PREFIX}/appointments`,
  bookmarks: `${STORAGE_PREFIX}/bookmarks`,
  messages: `${STORAGE_PREFIX}/messages`,
  recentSearches: `${STORAGE_PREFIX}/recentSearches`,
} as const;

/** expo-secure-store key holding the remembered session. */
export const SESSION_KEY = 'session';

/** Every per-user namespace, used when deleting an account. */
export const USER_SCOPED_KEYS = [
  STORAGE_KEYS.appointments,
  STORAGE_KEYS.bookmarks,
  STORAGE_KEYS.messages,
  STORAGE_KEYS.recentSearches,
] as const;
