import NetInfo from '@react-native-community/netinfo';
import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  clearLocalUserData,
  createLocalRepositories,
  initializeDatabase,
  type LocalRepositories,
} from '@/db';
import {
  addLocalDays,
  startOfLocalYear,
  endOfLocalYear,
  todayLocalDate,
} from '@/domain/dates';
import type {
  AiCostSummary,
  CreateFoodEntryInput,
  CreatePresetInput,
  DailyGoals,
  DailyTotal,
  FoodEntry,
  LocalDate,
  NutritionEstimate,
  Preset,
  SyncStatus,
  UpdateDailyGoalsInput,
  UpdateFoodEntryInput,
  UpdatePresetInput,
  UserId,
} from '@/domain/models';
import {
  EmailPasswordAuthService,
  type EmailSignUpStatus,
} from '@/services/auth/emailPasswordAuth';
import { getAiCostSummary } from '@/services/cost/aiCostSummary';
import { estimateNutrition } from '@/services/estimation/nutritionEstimation';
import {
  getSupabaseClient,
  registerSupabaseSessionRefresh,
} from '@/services/supabase/client';
import { SyncService } from '@/services/sync/syncService';

export interface ReviewDraft extends CreateFoodEntryInput {
  confidence?: NutritionEstimate['confidence'];
  assumptions?: string;
}

type AppUser = { id: UserId; email: string | null };

type AppContextValue = {
  ready: boolean;
  error: string | null;
  user: AppUser | null;
  goals: DailyGoals | null;
  entries: FoodEntry[];
  presets: Preset[];
  online: boolean;
  syncStatus: SyncStatus;
  costSummary: AiCostSummary | null;
  reviewDraft: ReviewDraft | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<EmailSignUpStatus>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  saveGoals: (goals: UpdateDailyGoalsInput) => Promise<void>;
  refresh: () => Promise<void>;
  retrySync: () => Promise<void>;
  loadDate: (date: LocalDate) => Promise<void>;
  createEntry: (input: CreateFoodEntryInput) => Promise<FoodEntry>;
  updateEntry: (id: string, input: UpdateFoodEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  createPreset: (input: CreatePresetInput) => Promise<Preset>;
  updatePreset: (id: string, input: UpdatePresetInput) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  togglePresetFavorite: (id: string, favorite: boolean) => Promise<void>;
  quickAddPreset: (preset: Preset) => Promise<FoodEntry>;
  estimateText: (description: string, signal?: AbortSignal) => Promise<NutritionEstimate>;
  estimatePhoto: (
    imageBase64: string,
    context: string,
    signal?: AbortSignal,
  ) => Promise<NutritionEstimate>;
  setReviewDraft: (draft: ReviewDraft | null) => void;
  entriesForDate: (date: LocalDate) => FoodEntry[];
  dailyTotals: (start: LocalDate, end: LocalDate) => DailyTotal[];
};

const AppContext = createContext<AppContextValue | null>(null);

const emptySyncStatus: SyncStatus = {
  phase: 'idle',
  pendingCount: 0,
  lastSuccessfulSyncAt: null,
  lastError: null,
};

function publicUser(user: User): AppUser {
  return { id: user.id as UserId, email: user.email ?? null };
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function AppProvider({ children }: PropsWithChildren) {
  const repositories = useRef<LocalRepositories | null>(null);
  const syncService = useRef<SyncService | null>(null);
  const stopSync = useRef<(() => void) | null>(null);
  const currentUserId = useRef<UserId | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [goals, setGoals] = useState<DailyGoals | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [totals, setTotals] = useState<DailyTotal[]>([]);
  const [online, setOnline] = useState(true);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [costSummary, setCostSummary] = useState<AiCostSummary | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(emptySyncStatus);

  const loadForUser = useCallback(async (supabaseUser: User) => {
    const appUser = publicUser(supabaseUser);
    const repos = await createLocalRepositories(appUser.id);
    repositories.current = repos;
    currentUserId.current = appUser.id;
    stopSync.current?.();
    const service = new SyncService(appUser.id, repos);
    syncService.current = service;
    const unsubscribeStatus = service.subscribe(setSyncStatus);
    const stopAutoSync = service.startAutoSync();
    stopSync.current = () => {
      unsubscribeStatus();
      stopAutoSync();
    };
    const today = todayLocalDate();
    const readLocal = () =>
      Promise.all([
        repos.settings.getDailyGoals(),
        repos.entries.listEntriesForDate(today),
        repos.presets.listPresets(),
        repos.entries.getDailyTotals(
          addLocalDays(startOfLocalYear(today), -6),
          endOfLocalYear(today),
        ),
        service.getStatus(),
      ] as const);
    let [storedGoals, storedEntries, storedPresets, annualTotals, status] =
      await readLocal();
    const network = await NetInfo.fetch();
    if (network.isConnected && network.isInternetReachable !== false) {
      try {
        await service.synchronize();
        [storedGoals, storedEntries, storedPresets, annualTotals, status] = await readLocal();
      } catch {
        status = await repos.syncQueue.getStatus('error');
      }
    }
    setUser(appUser);
    setGoals(storedGoals);
    setEntries(storedEntries);
    setPresets(storedPresets);
    setTotals(annualTotals);
    setSyncStatus(status);
    try {
      setCostSummary(await getAiCostSummary());
    } catch {
      setCostSummary(null);
    }
  }, []);

  const resetUserState = useCallback(() => {
    stopSync.current?.();
    stopSync.current = null;
    syncService.current = null;
    repositories.current = null;
    currentUserId.current = null;
    setUser(null);
    setGoals(null);
    setEntries([]);
    setPresets([]);
    setTotals([]);
    setCostSummary(null);
    setSyncStatus(emptySyncStatus);
    setReviewDraft(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const netSubscription = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(connected);
      setSyncStatus((current) => ({
        ...current,
        phase: connected ? (current.phase === 'offline' ? 'idle' : current.phase) : 'offline',
      }));
    });
    let stopRefresh: (() => void) | undefined;
    let authUnsubscribe: (() => void) | undefined;

    const initialize = async () => {
      try {
        await initializeDatabase();
        const supabase = getSupabaseClient();
        stopRefresh = registerSupabaseSessionRefresh();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (data.session?.user) await loadForUser(data.session.user);
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          if (!session) {
            resetUserState();
          } else if (session.user.id !== currentUserId.current) {
            void loadForUser(session.user).catch((caught) =>
              setError(messageFromError(caught, 'Could not load your local data.')),
            );
          }
        });
        authUnsubscribe = () => listener.subscription.unsubscribe();
      } catch (caught) {
        if (mounted) setError(messageFromError(caught, 'Cal Tracker could not start.'));
      } finally {
        if (mounted) setReady(true);
      }
    };
    void initialize();

    return () => {
      mounted = false;
      netSubscription();
      stopRefresh?.();
      authUnsubscribe?.();
    };
  }, [loadForUser, resetUserState]);

  const refreshTotalsAndStatus = useCallback(async () => {
    const repos = repositories.current;
    if (!repos) return;
    const today = todayLocalDate();
    const [nextTotals, status] = await Promise.all([
      repos.entries.getDailyTotals(addLocalDays(startOfLocalYear(today), -6), endOfLocalYear(today)),
      repos.syncQueue.getStatus(online ? 'idle' : 'offline'),
    ]);
    setTotals(nextTotals);
    setSyncStatus(status);
  }, [online]);

  const synchronizeInBackground = useCallback(() => {
    if (!online) return;
    void syncService.current?.synchronize().catch(() => undefined);
  }, [online]);

  const refresh = useCallback(async () => {
    setError(null);
    const supabase = getSupabaseClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (data.session?.user) {
      await loadForUser(data.session.user);
    } else {
      resetUserState();
    }
  }, [loadForUser, resetUserState]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const result = await new EmailPasswordAuthService().signIn(email, password);
    await loadForUser(result.user);
  }, [loadForUser]);

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
  ): Promise<EmailSignUpStatus> => {
    const result = await new EmailPasswordAuthService().signUp(email, password);
    if (result.status === 'signed_in') await loadForUser(result.user);
    return result.status;
  }, [loadForUser]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const { error: signOutError } = await supabase.auth.signOut();
    if (session?.user) {
      await clearLocalUserData(session.user.id as UserId);
    }
    if (signOutError) throw signOutError;
    resetUserState();
  }, [resetUserState]);

  const restoreSession = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!data.session) throw new Error('Your session has expired. Sign in again.');
    const refreshed = await supabase.auth.refreshSession(data.session);
    if (refreshed.error) throw refreshed.error;
    if (!refreshed.data.user) throw new Error('Your session could not be restored.');
    await loadForUser(refreshed.data.user);
  }, [loadForUser]);

  const loadDate = useCallback(async (date: LocalDate) => {
    const repos = repositories.current;
    if (!repos) return;
    const dayEntries = await repos.entries.listEntriesForDate(date);
    setEntries((current) => [
      ...current.filter((entry) => entry.localDate !== date),
      ...dayEntries,
    ]);
  }, []);

  const saveGoals = useCallback(async (next: UpdateDailyGoalsInput) => {
    const repos = repositories.current;
    if (!repos) throw new Error('Sign in before saving goals.');
    const saved = await repos.settings.updateDailyGoals(next);
    setGoals(saved);
    setSyncStatus(await repos.syncQueue.getStatus(online ? 'idle' : 'offline'));
    synchronizeInBackground();
  }, [online, synchronizeInBackground]);

  const createEntry = useCallback(
    async (input: CreateFoodEntryInput) => {
      const repos = repositories.current;
      if (!repos) throw new Error('Sign in before saving an entry.');
      const saved = await repos.entries.createEntry(input);
      setEntries((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
      await refreshTotalsAndStatus();
      synchronizeInBackground();
      return saved;
    },
    [refreshTotalsAndStatus, synchronizeInBackground],
  );

  const updateEntry = useCallback(
    async (id: string, input: UpdateFoodEntryInput) => {
      const repos = repositories.current;
      if (!repos) throw new Error('Sign in before editing an entry.');
      const saved = await repos.entries.updateEntry(id, input);
      setEntries((current) => [saved, ...current.filter((entry) => entry.id !== id)]);
      await refreshTotalsAndStatus();
      synchronizeInBackground();
    },
    [refreshTotalsAndStatus, synchronizeInBackground],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const repos = repositories.current;
      if (!repos) throw new Error('Sign in before deleting an entry.');
      await repos.entries.deleteEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      await refreshTotalsAndStatus();
      synchronizeInBackground();
    },
    [refreshTotalsAndStatus, synchronizeInBackground],
  );

  const createPreset = useCallback(async (input: CreatePresetInput) => {
    const repos = repositories.current;
    if (!repos) throw new Error('Sign in before saving a preset.');
    const saved = await repos.presets.createPreset(input);
    setPresets((current) => [...current.filter((preset) => preset.id !== saved.id), saved]);
    setSyncStatus(await repos.syncQueue.getStatus(online ? 'idle' : 'offline'));
    synchronizeInBackground();
    return saved;
  }, [online, synchronizeInBackground]);

  const updatePreset = useCallback(async (id: string, input: UpdatePresetInput) => {
    const repos = repositories.current;
    if (!repos) throw new Error('Sign in before editing a preset.');
    const saved = await repos.presets.updatePreset(id, input);
    setPresets((current) => current.map((preset) => (preset.id === id ? saved : preset)));
    setSyncStatus(await repos.syncQueue.getStatus(online ? 'idle' : 'offline'));
    synchronizeInBackground();
  }, [online, synchronizeInBackground]);

  const deletePreset = useCallback(async (id: string) => {
    const repos = repositories.current;
    if (!repos) throw new Error('Sign in before deleting a preset.');
    await repos.presets.deletePreset(id);
    setPresets((current) => current.filter((preset) => preset.id !== id));
    setSyncStatus(await repos.syncQueue.getStatus(online ? 'idle' : 'offline'));
    synchronizeInBackground();
  }, [online, synchronizeInBackground]);

  const togglePresetFavorite = useCallback(
    async (id: string, favorite: boolean) => updatePreset(id, { isFavorite: favorite }),
    [updatePreset],
  );

  const quickAddPreset = useCallback(
    (preset: Preset) =>
      createEntry({
        name: preset.name,
        calories: preset.calories,
        proteinG: preset.proteinG,
        carbsG: preset.carbsG,
        fatG: preset.fatG,
        localDate: todayLocalDate(),
        source: 'preset',
        presetId: preset.id,
        notes: preset.servingLabel,
      }),
    [createEntry],
  );

  const retrySync = useCallback(async () => {
    if (!online) throw new Error('Connect to the internet before retrying sync.');
    const service = syncService.current;
    if (!service) throw new Error('Restore your account session before syncing.');
    setSyncStatus(await service.synchronize());
    const supabaseUser = await getSupabaseClient().auth.getUser();
    if (supabaseUser.error) throw supabaseUser.error;
    if (supabaseUser.data.user) await loadForUser(supabaseUser.data.user);
  }, [loadForUser, online]);

  const estimateText = useCallback(
    async (description: string, signal?: AbortSignal) => {
      const estimate = await estimateNutrition(
        { type: 'text', description },
        signal ? { signal } : {},
      );
      void getAiCostSummary().then(setCostSummary).catch(() => undefined);
      return estimate;
    },
    [],
  );

  const estimatePhoto = useCallback(
    async (imageBase64: string, context: string, signal?: AbortSignal) => {
      const estimate = await estimateNutrition(
        {
          type: 'photo',
          imageBase64,
          mimeType: 'image/jpeg',
          ...(context ? { caption: context } : {}),
        },
        signal ? { signal } : {},
      );
      void getAiCostSummary().then(setCostSummary).catch(() => undefined);
      return estimate;
    },
    [],
  );

  const entriesForDate = useCallback(
    (date: LocalDate) =>
      entries
        .filter((entry) => entry.localDate === date)
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
    [entries],
  );

  const dailyTotals = useCallback(
    (start: LocalDate, end: LocalDate) =>
      totals.filter((total) => total.localDate >= start && total.localDate <= end),
    [totals],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      error,
      user,
      goals,
      entries,
      presets,
      online,
      syncStatus,
      costSummary,
      reviewDraft,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      restoreSession,
      saveGoals,
      refresh,
      retrySync,
      loadDate,
      createEntry,
      updateEntry,
      deleteEntry,
      createPreset,
      updatePreset,
      deletePreset,
      togglePresetFavorite,
      quickAddPreset,
      estimateText,
      estimatePhoto,
      setReviewDraft,
      entriesForDate,
      dailyTotals,
    }),
    [
      costSummary,
      createEntry,
      createPreset,
      dailyTotals,
      deleteEntry,
      deletePreset,
      entries,
      entriesForDate,
      error,
      estimatePhoto,
      estimateText,
      goals,
      loadDate,
      online,
      presets,
      quickAddPreset,
      ready,
      refresh,
      restoreSession,
      retrySync,
      reviewDraft,
      saveGoals,
      signInWithEmail,
      signOut,
      signUpWithEmail,
      syncStatus,
      togglePresetFavorite,
      updateEntry,
      updatePreset,
      user,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}
