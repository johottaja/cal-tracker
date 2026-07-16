import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type SecureStoreOptions = SecureStore.SecureStoreOptions;

export async function getItemAsync(
  key: string,
  options?: SecureStoreOptions,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key, options);
}

export async function setItemAsync(
  key: string,
  value: string,
  options?: SecureStoreOptions,
): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, options);
}

export async function deleteItemAsync(
  key: string,
  options?: SecureStoreOptions,
): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key, options);
}

export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY =
  SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
