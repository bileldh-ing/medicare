import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { SESSION_KEY } from '@/constants/app';
import { asyncStorage } from '@/utils/storage';

import { LocalAuthService, type AuthService, type SecureStorage } from './authService';
import type { CryptoProvider } from './hash';

const expoCrypto: CryptoProvider = {
  randomBytes: (n) => Crypto.getRandomBytes(n),
  sha256Hex: (data) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data, {
      encoding: Crypto.CryptoEncoding.HEX,
    }),
};

/** expo-secure-store on device; falls back to AsyncStorage on web (no keychain there). */
const secureStorage: SecureStorage =
  Platform.OS === 'web'
    ? asyncStorage
    : {
        getItem: (k) => SecureStore.getItemAsync(k),
        setItem: (k, v) => SecureStore.setItemAsync(k, v),
        removeItem: (k) => SecureStore.deleteItemAsync(k),
      };

/**
 * The single AuthService instance used by the app. To move to a real backend,
 * implement `AuthService` (e.g. `RestAuthService`) and export it here instead.
 */
export const authService: AuthService = new LocalAuthService({
  storage: asyncStorage,
  secure: secureStorage,
  crypto: expoCrypto,
  sessionKey: SESSION_KEY,
});
