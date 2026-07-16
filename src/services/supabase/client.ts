import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import * as SecureStore from '@/platform/secureStore';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { Database } from './database.types';

const CHUNK_SIZE = 1_800;
const KEYCHAIN_SERVICE = 'cal-tracker.supabase-session';

interface StorageManifest {
  version: string;
  chunks: number;
}

function storageBaseKey(key: string): string {
  const encoded = Array.from(key)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return `caltracker.${encoded}`;
}

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainService: KEYCHAIN_SERVICE,
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function readManifest(key: string): Promise<StorageManifest | null> {
  const raw = await SecureStore.getItemAsync(
    `${storageBaseKey(key)}.manifest`,
    secureStoreOptions,
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StorageManifest>;
    if (
      typeof parsed.version !== 'string' ||
      !Number.isInteger(parsed.chunks) ||
      (parsed.chunks ?? 0) < 1
    ) {
      return null;
    }
    return parsed as StorageManifest;
  } catch {
    return null;
  }
}

const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const manifest = await readManifest(key);
    if (!manifest) return null;
    const chunks = await Promise.all(
      Array.from({ length: manifest.chunks }, (_, index) =>
        SecureStore.getItemAsync(
          `${storageBaseKey(key)}.${manifest.version}.${index}`,
          secureStoreOptions,
        ),
      ),
    );
    return chunks.some((chunk) => chunk === null)
      ? null
      : (chunks as string[]).join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await readManifest(key);
    const version = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks =
      value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(
          `${storageBaseKey(key)}.${version}.${index}`,
          chunk,
          secureStoreOptions,
        ),
      ),
    );
    await SecureStore.setItemAsync(
      `${storageBaseKey(key)}.manifest`,
      JSON.stringify({ version, chunks: chunks.length }),
      secureStoreOptions,
    );
    if (previous) {
      await Promise.all(
        Array.from({ length: previous.chunks }, (_, index) =>
          SecureStore.deleteItemAsync(
            `${storageBaseKey(key)}.${previous.version}.${index}`,
            secureStoreOptions,
          ),
        ),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    const manifest = await readManifest(key);
    await SecureStore.deleteItemAsync(
      `${storageBaseKey(key)}.manifest`,
      secureStoreOptions,
    );
    if (manifest) {
      await Promise.all(
        Array.from({ length: manifest.chunks }, (_, index) =>
          SecureStore.deleteItemAsync(
            `${storageBaseKey(key)}.${manifest.version}.${index}`,
            secureStoreOptions,
          ),
        ),
      );
    }
  },
};

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required',
    );
  }
  client = createClient<Database>(url, publishableKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function registerSupabaseSessionRefresh(): () => void {
  const supabase = getSupabaseClient();
  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}
