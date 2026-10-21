import { STORAGE_KEYS } from '@/constants/app';
import {
  AuthError,
  LOCKOUT_MS,
  LocalAuthService,
  REMEMBER_MS,
  type StoredUser,
} from '@/features/auth/authService';
import { constantTimeEqual, hashPassword } from '@/features/auth/hash';
import { isValidPassword, passwordStrength, signupSchema } from '@/features/auth/schemas';

import { clock, memorySecure, memoryStorage, nodeCrypto } from './helpers';

function setup() {
  const storage = memoryStorage();
  const secure = memorySecure();
  const c = clock();
  const make = () => new LocalAuthService({ storage, secure, crypto: nodeCrypto, now: c.now });
  return { storage, secure, clock: c, service: make(), relaunch: make };
}

const ALICE = {
  name: 'Alice Martin',
  email: 'Alice@Example.com',
  password: 'secret123',
  phone: '',
};

function users(storage: ReturnType<typeof memoryStorage>): StoredUser[] {
  return JSON.parse(storage.data.get(STORAGE_KEYS.users) ?? '[]');
}

async function expectAuthError(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(AuthError);
  await p.catch((e: AuthError) => expect(e.code).toBe(code));
}

describe('hash helpers', () => {
  it('constantTimeEqual compares exactly', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });

  it('salted hashes differ per salt', async () => {
    const a = await hashPassword('secret123', 'salt-a', nodeCrypto);
    const b = await hashPassword('secret123', 'salt-b', nodeCrypto);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('password rules', () => {
  it('requires 8+ chars with a letter and a number', () => {
    expect(isValidPassword('short1')).toBe(false);
    expect(isValidPassword('longpassword')).toBe(false);
    expect(isValidPassword('12345678')).toBe(false);
    expect(isValidPassword('secret123')).toBe(true);
  });

  it('strength meter grades weak / medium / strong', () => {
    expect(passwordStrength('').label).toBe('empty');
    expect(passwordStrength('abc').label).toBe('weak');
    expect(passwordStrength('Secret123').label).toBe('medium');
    expect(passwordStrength('Secret123!LongEnough').label).toBe('strong');
  });

  it('signup schema validates every field', () => {
    const bad = signupSchema.safeParse({
      name: 'A',
      email: 'nope',
      phone: 'x',
      password: 'short',
      confirm: 'other',
      terms: false,
    });
    expect(bad.success).toBe(false);
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'phone', 'password', 'terms']));
    const ok = signupSchema.safeParse({
      name: 'Alice',
      email: 'a@b.co',
      phone: '',
      password: 'secret123',
      confirm: 'secret123',
      terms: true,
    });
    expect(ok.success).toBe(true);
  });
});

describe('LocalAuthService', () => {
  it('signs up with a salted hash and never stores the plain password', async () => {
    const { service, storage } = setup();
    const { user, session } = await service.signUp(ALICE);
    expect(user.email).toBe('alice@example.com');
    const [stored] = users(storage);
    expect(stored).toBeDefined();
    expect(stored!.passwordHash).not.toContain('secret123');
    expect(stored!.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(storage.data.get(STORAGE_KEYS.users))).not.toContain('secret123');
    expect(session.remember).toBe(true);
  });

  it('gives each user a unique random salt', async () => {
    const { service, storage } = setup();
    await service.signUp(ALICE);
    await service.signUp({ ...ALICE, email: 'bob@example.com', name: 'Bob' });
    const [a, b] = users(storage);
    expect(a!.salt).not.toBe(b!.salt);
    expect(a!.passwordHash).not.toBe(b!.passwordHash);
  });

  it('rejects a duplicate email case-insensitively', async () => {
    const { service } = setup();
    await service.signUp(ALICE);
    await expectAuthError(
      service.signUp({ ...ALICE, email: '  ALICE@example.COM ' }),
      'EMAIL_TAKEN',
    );
  });

  it('rejects weak passwords at the service level too', async () => {
    const { service } = setup();
    await expectAuthError(service.signUp({ ...ALICE, password: 'password' }), 'WEAK_PASSWORD');
  });

  it('signs in with the right password and a generic error otherwise', async () => {
    const { service } = setup();
    await service.signUp(ALICE);
    await service.signOut();
    const ok = await service.signIn({
      email: 'alice@example.com',
      password: 'secret123',
      remember: true,
    });
    expect(ok.user.name).toBe('Alice Martin');

    const wrong = service.signIn({
      email: 'alice@example.com',
      password: 'wrong123',
      remember: true,
    });
    await expect(wrong).rejects.toThrow('Incorrect email or password');
    const unknown = service.signIn({
      email: 'ghost@example.com',
      password: 'secret123',
      remember: true,
    });
    await expect(unknown).rejects.toThrow('Incorrect email or password');
  });

  it('remember me ON persists a 30-day session across relaunch', async () => {
    const { service, secure, relaunch, clock: c } = setup();
    await service.signUp(ALICE);
    await service.signOut();
    const { session } = await service.signIn({
      email: ALICE.email,
      password: 'secret123',
      remember: true,
    });
    expect(session.expiresAt).toBe(c.now() + REMEMBER_MS);
    expect(secure.data.get('session')).toBeDefined();

    const again = await relaunch().getSession();
    expect(again?.user.email).toBe('alice@example.com');

    c.advance(REMEMBER_MS + 1);
    expect(await relaunch().getSession()).toBeNull();
    expect(secure.data.get('session')).toBeUndefined();
  });

  it('remember me OFF keeps the session in memory only', async () => {
    const { service, secure, relaunch } = setup();
    await service.signUp(ALICE);
    await service.signOut();
    await service.signIn({ email: ALICE.email, password: 'secret123', remember: false });
    expect(secure.data.get('session')).toBeUndefined();
    expect((await service.getSession())?.user.email).toBe('alice@example.com');
    // "App closed": a fresh instance has no memory session.
    expect(await relaunch().getSession()).toBeNull();
  });

  it('locks sign-in for 30 seconds after 5 failed attempts in a row', async () => {
    const { service, clock: c } = setup();
    await service.signUp(ALICE);
    await service.signOut();
    const bad = () => service.signIn({ email: ALICE.email, password: 'nope1234', remember: false });
    for (let i = 0; i < 4; i++) await expectAuthError(bad(), 'INVALID_CREDENTIALS');
    const fifth = bad();
    await expectAuthError(fifth, 'LOCKED');
    await fifth.catch((e: AuthError) => expect(e.retryAt).toBe(c.now() + LOCKOUT_MS));

    // Even the right password is refused while locked.
    await expectAuthError(
      service.signIn({ email: ALICE.email, password: 'secret123', remember: false }),
      'LOCKED',
    );
    expect(service.getLockState().lockedUntil).toBe(c.now() + LOCKOUT_MS);

    c.advance(LOCKOUT_MS + 1);
    const ok = await service.signIn({ email: ALICE.email, password: 'secret123', remember: false });
    expect(ok.user.email).toBe('alice@example.com');
    expect(service.getLockState()).toEqual({ failedAttempts: 0, lockedUntil: null });
  });

  it('a successful sign-in resets the failure counter', async () => {
    const { service } = setup();
    await service.signUp(ALICE);
    const bad = () => service.signIn({ email: ALICE.email, password: 'nope1234', remember: false });
    for (let i = 0; i < 4; i++) await expectAuthError(bad(), 'INVALID_CREDENTIALS');
    await service.signIn({ email: ALICE.email, password: 'secret123', remember: false });
    await expectAuthError(bad(), 'INVALID_CREDENTIALS'); // 1st failure again, not a lock
  });

  it('logout removes only the session; users and data stay', async () => {
    const { service, storage, secure } = setup();
    const { user } = await service.signUp(ALICE);
    storage.data.set(`${STORAGE_KEYS.appointments}/${user.id}`, '{"state":{}}');
    await service.signOut();
    expect(secure.data.get('session')).toBeUndefined();
    expect(await service.getSession()).toBeNull();
    expect(users(storage)).toHaveLength(1);
    expect(storage.data.get(`${STORAGE_KEYS.appointments}/${user.id}`)).toBeDefined();
  });

  it('change password requires the current password', async () => {
    const { service } = setup();
    const { user } = await service.signUp(ALICE);
    await expectAuthError(
      service.changePassword(user.id, 'wrong123', 'newpass456'),
      'WRONG_PASSWORD',
    );
    await service.changePassword(user.id, 'secret123', 'newpass456');
    await service.signOut();
    await expectAuthError(
      service.signIn({ email: ALICE.email, password: 'secret123', remember: false }),
      'INVALID_CREDENTIALS',
    );
    const ok = await service.signIn({
      email: ALICE.email,
      password: 'newpass456',
      remember: false,
    });
    expect(ok.user.id).toBe(user.id);
  });

  it('forgot password (demo) resets the password for an existing email', async () => {
    const { service } = setup();
    await service.signUp(ALICE);
    expect(await service.emailExists('ALICE@example.com')).toBe(true);
    expect(await service.emailExists('nobody@example.com')).toBe(false);
    await service.resetPassword('alice@example.com', 'brandnew99');
    const ok = await service.signIn({
      email: ALICE.email,
      password: 'brandnew99',
      remember: false,
    });
    expect(ok.user.name).toBe('Alice Martin');
    await expectAuthError(
      service.resetPassword('nobody@example.com', 'brandnew99'),
      'USER_NOT_FOUND',
    );
  });

  it('delete account removes the user and all namespaced data', async () => {
    const { service, storage } = setup();
    const { user } = await service.signUp(ALICE);
    const other = await service.signUp({ ...ALICE, email: 'bob@example.com', name: 'Bob' });
    for (const base of [STORAGE_KEYS.appointments, STORAGE_KEYS.bookmarks, STORAGE_KEYS.messages]) {
      storage.data.set(`${base}/${user.id}`, '{}');
      storage.data.set(`${base}/${other.user.id}`, '{}');
    }
    await service.deleteAccount(user.id);
    expect(users(storage).map((u) => u.email)).toEqual(['bob@example.com']);
    for (const base of [STORAGE_KEYS.appointments, STORAGE_KEYS.bookmarks, STORAGE_KEYS.messages]) {
      expect(storage.data.get(`${base}/${user.id}`)).toBeUndefined();
      expect(storage.data.get(`${base}/${other.user.id}`)).toBe('{}'); // isolation
    }
    expect(await service.getSession()).toBeNull();
  });

  it('updates the profile', async () => {
    const { service } = setup();
    const { user } = await service.signUp(ALICE);
    const updated = await service.updateProfile(user.id, {
      name: 'Alice M.',
      phone: '+216 20 000 000',
    });
    expect(updated.name).toBe('Alice M.');
    expect((await service.getSession())?.user.phone).toBe('+216 20 000 000');
  });

  it('guest mode uses a stable guest id and an in-memory session', async () => {
    const { service, secure, relaunch } = setup();
    const a = await service.signInAsGuest();
    expect(a.user.isGuest).toBe(true);
    expect(a.user.id).toMatch(/^guest_/);
    expect(secure.data.get('session')).toBeUndefined();
    const b = await relaunch().signInAsGuest();
    expect(b.user.id).toBe(a.user.id);
  });

  it('survives corrupted storage', async () => {
    const { service, storage, secure } = setup();
    storage.data.set(STORAGE_KEYS.users, '{not json');
    secure.data.set('session', 'garbage');
    expect(await service.getSession()).toBeNull();
    const { user } = await service.signUp(ALICE);
    expect(user.email).toBe('alice@example.com');
  });
});
