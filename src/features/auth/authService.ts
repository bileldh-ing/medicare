import { STORAGE_KEYS, USER_SCOPED_KEYS } from '@/constants/app';
import { createJsonStore, scopedKey, type KeyValueStorage } from '@/utils/storage';

import {
  constantTimeEqual,
  generateSalt,
  generateToken,
  hashPassword,
  toHex,
  type CryptoProvider,
} from './hash';
import { isValidPassword, normalizeEmail } from './schemas';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  avatarUri: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  avatarUri: string | null;
  isGuest: boolean;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
  remember: boolean;
  guest?: boolean;
}

export interface AuthResult {
  user: PublicUser;
  session: Session;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
  remember: boolean;
}

export type ProfilePatch = Partial<Pick<StoredUser, 'name' | 'phone' | 'avatarUri'>>;

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'LOCKED'
  | 'EMAIL_TAKEN'
  | 'USER_NOT_FOUND'
  | 'WRONG_PASSWORD'
  | 'WEAK_PASSWORD'
  | 'INVALID_INPUT'
  | 'NOT_ALLOWED';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    /** For LOCKED: epoch ms when sign-in unlocks. */
    public readonly retryAt?: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * The contract the UI depends on. Swap `LocalAuthService` for a REST / Firebase /
 * Supabase implementation without touching any screen.
 */
export interface AuthService {
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signInAsGuest(): Promise<AuthResult>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthResult | null>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<PublicUser>;
  changePassword(userId: string, current: string, next: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
  /** Demo-only forgot-password flow. */
  emailExists(email: string): Promise<boolean>;
  resetPassword(email: string, newPassword: string): Promise<void>;
  getLockState(): { failedAttempts: number; lockedUntil: number | null };
}

export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface LocalAuthDeps {
  storage: KeyValueStorage;
  secure: SecureStorage;
  crypto: CryptoProvider;
  now?: () => number;
  sessionKey?: string;
}

export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
/** In-memory sessions: valid until the process dies; this cap is a safety net. */
export const MEMORY_SESSION_MS = 24 * 60 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 30 * 1000;
const LOCK_KEY = `${STORAGE_KEYS.users}:lock`;

function isStoredUser(v: unknown): v is StoredUser {
  if (!v || typeof v !== 'object') return false;
  const u = v as Record<string, unknown>;
  return (
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    typeof u.passwordHash === 'string' &&
    typeof u.salt === 'string'
  );
}

function isSession(v: unknown): v is Session {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.userId === 'string' && typeof s.token === 'string' && typeof s.expiresAt === 'number'
  );
}

export function toPublicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    createdAt: u.createdAt,
    avatarUri: u.avatarUri ?? null,
    isGuest: false,
  };
}

/* ------------------------------------------------------------------ */
/* Local (on-device) implementation                                   */
/* ------------------------------------------------------------------ */

export class LocalAuthService implements AuthService {
  private readonly json;
  private readonly now: () => number;
  private readonly sessionKey: string;
  private memorySession: Session | null = null;
  private failedAttempts = 0;
  private lockedUntil: number | null = null;
  private lockLoaded = false;

  constructor(private readonly deps: LocalAuthDeps) {
    this.json = createJsonStore(deps.storage);
    this.now = deps.now ?? Date.now;
    this.sessionKey = deps.sessionKey ?? 'session';
  }

  /* ---------- users ---------- */

  private async readUsers(): Promise<StoredUser[]> {
    const list = await this.json.get<unknown[]>(STORAGE_KEYS.users, []);
    return Array.isArray(list) ? list.filter(isStoredUser) : [];
  }

  private writeUsers(users: StoredUser[]) {
    return this.json.set(STORAGE_KEYS.users, users);
  }

  private async findByEmail(email: string): Promise<StoredUser | undefined> {
    const e = normalizeEmail(email);
    return (await this.readUsers()).find((u) => u.email === e);
  }

  /* ---------- sessions ---------- */

  private async createSession(userId: string, remember: boolean, guest = false): Promise<Session> {
    const session: Session = {
      userId,
      token: generateToken(this.deps.crypto),
      expiresAt: this.now() + (remember ? REMEMBER_MS : MEMORY_SESSION_MS),
      remember,
      ...(guest ? { guest: true } : null),
    };
    if (remember) {
      this.memorySession = null;
      await this.deps.secure.setItem(this.sessionKey, JSON.stringify(session));
    } else {
      // "Remember me" off: keep the session in memory only (gone when the app is closed).
      this.memorySession = session;
      await this.deps.secure.removeItem(this.sessionKey).catch(() => undefined);
    }
    return session;
  }

  private async clearSession() {
    this.memorySession = null;
    await this.deps.secure.removeItem(this.sessionKey).catch(() => undefined);
  }

  /* ---------- lockout ---------- */

  private async loadLock() {
    if (this.lockLoaded) return;
    this.lockLoaded = true;
    const lock = await this.json.get<{ failedAttempts?: number; lockedUntil?: number | null }>(
      LOCK_KEY,
      {},
    );
    this.failedAttempts = typeof lock.failedAttempts === 'number' ? lock.failedAttempts : 0;
    this.lockedUntil = typeof lock.lockedUntil === 'number' ? lock.lockedUntil : null;
  }

  private persistLock() {
    return this.json
      .set(LOCK_KEY, { failedAttempts: this.failedAttempts, lockedUntil: this.lockedUntil })
      .catch(() => undefined);
  }

  getLockState() {
    const lockedUntil = this.lockedUntil && this.lockedUntil > this.now() ? this.lockedUntil : null;
    return { failedAttempts: this.failedAttempts, lockedUntil };
  }

  private async registerFailure(): Promise<never> {
    this.failedAttempts += 1;
    if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.lockedUntil = this.now() + LOCKOUT_MS;
      this.failedAttempts = 0;
      await this.persistLock();
      throw new AuthError(
        'LOCKED',
        'Too many attempts. Try again in 30 seconds.',
        this.lockedUntil,
      );
    }
    await this.persistLock();
    throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password');
  }

  /* ---------- public API ---------- */

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const name = input.name.trim();
    const email = normalizeEmail(input.email);
    if (name.length < 2 || !email.includes('@')) {
      throw new AuthError('INVALID_INPUT', 'Please check your details');
    }
    if (!isValidPassword(input.password)) {
      throw new AuthError('WEAK_PASSWORD', 'Use at least 8 characters with a letter and a number');
    }
    const users = await this.readUsers();
    if (users.some((u) => u.email === email)) {
      throw new AuthError('EMAIL_TAKEN', 'This email is already registered');
    }
    const salt = generateSalt(this.deps.crypto);
    const user: StoredUser = {
      id: `u_${toHex(this.deps.crypto.randomBytes(8))}`,
      name,
      email,
      phone: (input.phone ?? '').trim(),
      passwordHash: await hashPassword(input.password, salt, this.deps.crypto),
      salt,
      createdAt: new Date(this.now()).toISOString(),
      avatarUri: null,
    };
    await this.writeUsers([...users, user]);
    // New accounts are remembered so a fresh sign-up survives an app restart.
    const session = await this.createSession(user.id, true);
    return { user: toPublicUser(user), session };
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    await this.loadLock();
    const lock = this.getLockState();
    if (lock.lockedUntil) {
      throw new AuthError('LOCKED', 'Too many attempts. Please wait.', lock.lockedUntil);
    }
    this.lockedUntil = null;

    const user = await this.findByEmail(input.email);
    // Hash even when the user does not exist so timing does not reveal registered emails.
    const salt = user?.salt ?? 'no-user-salt';
    const hash = await hashPassword(input.password, salt, this.deps.crypto);
    if (!user || !constantTimeEqual(hash, user.passwordHash)) {
      return this.registerFailure();
    }
    this.failedAttempts = 0;
    this.lockedUntil = null;
    await this.persistLock();
    const session = await this.createSession(user.id, input.remember);
    return { user: toPublicUser(user), session };
  }

  async signInAsGuest(): Promise<AuthResult> {
    let guestId = await this.json.get<string | null>(STORAGE_KEYS.guestId, null);
    if (typeof guestId !== 'string' || !guestId.startsWith('guest_')) {
      guestId = `guest_${toHex(this.deps.crypto.randomBytes(6))}`;
      await this.json.set(STORAGE_KEYS.guestId, guestId);
    }
    const session = await this.createSession(guestId, false, true);
    return { user: this.guestUser(guestId), session };
  }

  private guestUser(id: string): PublicUser {
    return {
      id,
      name: 'Guest',
      email: '',
      phone: '',
      createdAt: new Date(this.now()).toISOString(),
      avatarUri: null,
      isGuest: true,
    };
  }

  async signOut(): Promise<void> {
    // Session only: users and their data stay stored.
    await this.clearSession();
  }

  async getSession(): Promise<AuthResult | null> {
    let session: Session | null = this.memorySession;
    if (!session) {
      let raw: string | null = null;
      try {
        raw = await this.deps.secure.getItem(this.sessionKey);
      } catch {
        raw = null;
      }
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        session = isSession(parsed) ? parsed : null;
      } catch {
        session = null;
      }
    }
    if (!session) return null;
    if (session.expiresAt <= this.now()) {
      await this.clearSession();
      return null;
    }
    if (session.guest) return { user: this.guestUser(session.userId), session };
    const user = (await this.readUsers()).find((u) => u.id === session.userId);
    if (!user) {
      await this.clearSession();
      return null;
    }
    return { user: toPublicUser(user), session };
  }

  async updateProfile(userId: string, patch: ProfilePatch): Promise<PublicUser> {
    const users = await this.readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    const current = users[idx];
    if (!current) throw new AuthError('NOT_ALLOWED', 'Create an account to edit your profile');
    const next: StoredUser = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : null),
      ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : null),
      ...(patch.avatarUri !== undefined ? { avatarUri: patch.avatarUri } : null),
    };
    if (next.name.length < 2) throw new AuthError('INVALID_INPUT', 'Name is too short');
    users[idx] = next;
    await this.writeUsers(users);
    return toPublicUser(next);
  }

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    const users = await this.readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    const user = users[idx];
    if (!user) throw new AuthError('USER_NOT_FOUND', 'Account not found');
    const hash = await hashPassword(current, user.salt, this.deps.crypto);
    if (!constantTimeEqual(hash, user.passwordHash)) {
      throw new AuthError('WRONG_PASSWORD', 'Current password is incorrect');
    }
    if (!isValidPassword(next)) {
      throw new AuthError('WEAK_PASSWORD', 'Use at least 8 characters with a letter and a number');
    }
    const salt = generateSalt(this.deps.crypto);
    users[idx] = { ...user, salt, passwordHash: await hashPassword(next, salt, this.deps.crypto) };
    await this.writeUsers(users);
  }

  async deleteAccount(userId: string): Promise<void> {
    const users = await this.readUsers();
    await this.writeUsers(users.filter((u) => u.id !== userId));
    await Promise.all(USER_SCOPED_KEYS.map((base) => this.json.remove(scopedKey(base, userId))));
    await this.clearSession();
  }

  async emailExists(email: string): Promise<boolean> {
    return !!(await this.findByEmail(email));
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    if (!isValidPassword(newPassword)) {
      throw new AuthError('WEAK_PASSWORD', 'Use at least 8 characters with a letter and a number');
    }
    const users = await this.readUsers();
    const e = normalizeEmail(email);
    const idx = users.findIndex((u) => u.email === e);
    const user = users[idx];
    if (!user) throw new AuthError('USER_NOT_FOUND', 'No account found for this email');
    const salt = generateSalt(this.deps.crypto);
    users[idx] = {
      ...user,
      salt,
      passwordHash: await hashPassword(newPassword, salt, this.deps.crypto),
    };
    await this.writeUsers(users);
    this.failedAttempts = 0;
    this.lockedUntil = null;
    await this.persistLock();
  }
}
