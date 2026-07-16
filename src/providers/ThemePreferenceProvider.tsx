import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance } from 'react-native';
import * as SecureStore from '@/platform/secureStore';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'caltracker.theme-preference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  ready: boolean;
  setPreference: (value: ThemePreference) => Promise<void>;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(
  null,
);

function parsePreference(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

function applyPreference(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? null : preference);
}

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (cancelled) return;
        const next = parsePreference(stored);
        setPreferenceState(next);
        applyPreference(next);
      } catch {
        if (!cancelled) applyPreference('system');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    applyPreference(value);
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  }, []);

  const value = useMemo(
    () => ({ preference, ready, setPreference }),
    [preference, ready, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return value;
}
