import NetInfo, {
  type NetInfoSubscription,
} from '@react-native-community/netinfo';
import { z } from 'zod';

import type { LocalRepositories } from '../../db';
import {
  asLocalDate,
  asUtcTimestamp,
  nowUtc,
  type AppSetting,
  type DailyGoals,
  type FoodEntry,
  type Preset,
  type SyncOperation,
  type SyncStatus,
  type UserId,
} from '../../domain';
import { getSupabaseClient } from '../supabase/client';
import type {
  CloudAppSetting,
  CloudDailyGoals,
  CloudFoodEntry,
  CloudPreset,
} from '../supabase/database.types';

const timestampSchema = z.string().datetime({ offset: true });
const macroSchema = {
  calories: z.number().int().nonnegative(),
  proteinG: z.number().finite().nonnegative(),
  carbsG: z.number().finite().nonnegative(),
  fatG: z.number().finite().nonnegative(),
};

const foodEntryPayloadSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    loggedAt: timestampSchema,
    name: z.string().min(1),
    ...macroSchema,
    source: z.enum(['manual', 'preset', 'ai_text', 'ai_photo']),
    presetId: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    deletedAt: timestampSchema.nullable(),
    remoteUpdatedAt: timestampSchema.nullable(),
  })
  .strict();

const presetPayloadSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['meal', 'item', 'portion']),
    servingLabel: z.string().nullable(),
    ...macroSchema,
    isFavorite: z.boolean(),
    sortOrder: z.number().int(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    deletedAt: timestampSchema.nullable(),
    remoteUpdatedAt: timestampSchema.nullable(),
  })
  .strict();

const goalsPayloadSchema = z
  .object({
    userId: z.string().min(1),
    ...macroSchema,
    updatedAt: timestampSchema,
    remoteUpdatedAt: timestampSchema.nullable(),
  })
  .strict();

const settingPayloadSchema = z
  .object({
    userId: z.string().min(1),
    key: z.literal('success_rule_version'),
    value: z.literal('1'),
    updatedAt: timestampSchema,
    remoteUpdatedAt: timestampSchema.nullable(),
  })
  .strict();

const PAGE_SIZE = 500;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown synchronization error';
}

function cloudFoodEntry(row: CloudFoodEntry): FoodEntry {
  return {
    id: row.id,
    userId: row.user_id as UserId,
    localDate: asLocalDate(row.local_date),
    loggedAt: asUtcTimestamp(row.logged_at),
    name: row.name,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    source: row.source,
    presetId: row.preset_id,
    notes: row.notes,
    createdAt: asUtcTimestamp(row.created_at),
    updatedAt: asUtcTimestamp(row.updated_at),
    deletedAt: row.deleted_at ? asUtcTimestamp(row.deleted_at) : null,
    remoteUpdatedAt: asUtcTimestamp(row.updated_at),
  };
}

function cloudPreset(row: CloudPreset): Preset {
  return {
    id: row.id,
    userId: row.user_id as UserId,
    name: row.name,
    kind: row.kind,
    servingLabel: row.serving_label,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isFavorite: row.is_favorite === 1,
    sortOrder: row.sort_order,
    createdAt: asUtcTimestamp(row.created_at),
    updatedAt: asUtcTimestamp(row.updated_at),
    deletedAt: row.deleted_at ? asUtcTimestamp(row.deleted_at) : null,
    remoteUpdatedAt: asUtcTimestamp(row.updated_at),
  };
}

function cloudGoals(row: CloudDailyGoals): DailyGoals {
  return {
    userId: row.user_id as UserId,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    updatedAt: asUtcTimestamp(row.updated_at),
    remoteUpdatedAt: asUtcTimestamp(row.updated_at),
  };
}

function cloudSetting(row: CloudAppSetting): AppSetting {
  if (row.key !== 'success_rule_version' || row.value !== '1') {
    throw new Error(`Unsupported remote setting: ${row.key}`);
  }
  return {
    userId: row.user_id as UserId,
    key: row.key,
    value: row.value,
    updatedAt: asUtcTimestamp(row.updated_at),
    remoteUpdatedAt: asUtcTimestamp(row.updated_at),
  };
}

export class SyncService {
  private listeners = new Set<(status: SyncStatus) => void>();
  private activeSync: Promise<SyncStatus> | null = null;
  private networkSubscription: NetInfoSubscription | null = null;
  private status: SyncStatus = {
    phase: 'idle',
    pendingCount: 0,
    lastSuccessfulSyncAt: null,
    lastError: null,
  };

  constructor(
    private readonly userId: UserId,
    private readonly repositories: LocalRepositories,
  ) {}

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  async getStatus(): Promise<SyncStatus> {
    this.status = await this.repositories.syncQueue.getStatus(this.status.phase);
    return this.status;
  }

  startAutoSync(): () => void {
    if (!this.networkSubscription) {
      this.networkSubscription = NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          void this.synchronize().catch(() => undefined);
        } else {
          void this.publishStatus('offline');
        }
      });
    }
    return () => this.stopAutoSync();
  }

  stopAutoSync(): void {
    this.networkSubscription?.();
    this.networkSubscription = null;
  }

  synchronize(): Promise<SyncStatus> {
    if (this.activeSync) return this.activeSync;
    this.activeSync = this.runSync().finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private async runSync(): Promise<SyncStatus> {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      return this.publishStatus('offline');
    }
    await this.requireCurrentUser();
    await this.publishStatus('syncing');

    let firstPushError: string | null = null;
    const operations = await this.repositories.syncQueue.listPending(500);
    for (const operation of operations) {
      try {
        await this.pushOperation(operation);
      } catch (error) {
        const message = errorMessage(error);
        firstPushError ??= message;
        await this.repositories.syncQueue.markAttempt(operation.id, message);
      }
    }

    try {
      await this.pullAll();
    } catch (error) {
      const message = errorMessage(error);
      await this.repositories.syncQueue.recordSyncError(message);
      return this.publishStatus('error');
    }

    if (firstPushError) {
      await this.repositories.syncQueue.recordSyncError(firstPushError);
      return this.publishStatus('error');
    }
    await this.repositories.syncQueue.recordSuccessfulSync(nowUtc());
    return this.publishStatus('idle');
  }

  private async requireCurrentUser(): Promise<void> {
    const {
      data: { user },
      error,
    } = await getSupabaseClient().auth.getUser();
    if (error) throw error;
    if (!user || user.id !== this.userId) {
      throw new Error('The active Supabase user does not match the local cache');
    }
  }

  private async pushOperation(operation: SyncOperation): Promise<void> {
    const supabase = getSupabaseClient();
    switch (operation.entityType) {
      case 'food_entry': {
        const entry = foodEntryPayloadSchema.parse(
          JSON.parse(operation.payload),
        );
        if (entry.userId !== this.userId) throw new Error('Queue user mismatch');
        const { data, error } = await supabase
          .from('food_entries')
          .upsert(
            {
              id: entry.id,
              local_date: entry.localDate,
              logged_at: entry.loggedAt,
              name: entry.name,
              calories: entry.calories,
              protein_g: entry.proteinG,
              carbs_g: entry.carbsG,
              fat_g: entry.fatG,
              source: entry.source,
              preset_id: entry.presetId,
              notes: entry.notes,
              created_at: entry.createdAt,
              updated_at: entry.updatedAt,
              deleted_at: entry.deletedAt,
            },
            { onConflict: 'id' },
          )
          .select('*')
          .single();
        if (error) throw error;
        await this.repositories.entries.applyRemote(
          cloudFoodEntry(data),
          operation.id,
        );
        return;
      }
      case 'preset': {
        const preset = presetPayloadSchema.parse(JSON.parse(operation.payload));
        if (preset.userId !== this.userId) throw new Error('Queue user mismatch');
        const { data, error } = await supabase
          .from('presets')
          .upsert(
            {
              id: preset.id,
              name: preset.name,
              kind: preset.kind,
              serving_label: preset.servingLabel,
              calories: preset.calories,
              protein_g: preset.proteinG,
              carbs_g: preset.carbsG,
              fat_g: preset.fatG,
              is_favorite: preset.isFavorite ? 1 : 0,
              sort_order: preset.sortOrder,
              created_at: preset.createdAt,
              updated_at: preset.updatedAt,
              deleted_at: preset.deletedAt,
            },
            { onConflict: 'id' },
          )
          .select('*')
          .single();
        if (error) throw error;
        await this.repositories.presets.applyRemote(
          cloudPreset(data),
          operation.id,
        );
        return;
      }
      case 'daily_goals': {
        const goals = goalsPayloadSchema.parse(JSON.parse(operation.payload));
        if (goals.userId !== this.userId) throw new Error('Queue user mismatch');
        const { data, error } = await supabase
          .from('daily_goals')
          .upsert(
            {
              calories: goals.calories,
              protein_g: goals.proteinG,
              carbs_g: goals.carbsG,
              fat_g: goals.fatG,
              updated_at: goals.updatedAt,
            },
            { onConflict: 'user_id' },
          )
          .select('*')
          .single();
        if (error) throw error;
        await this.repositories.settings.applyRemoteGoals(
          cloudGoals(data),
          operation.id,
        );
        return;
      }
      case 'app_setting': {
        const setting = settingPayloadSchema.parse(
          JSON.parse(operation.payload),
        );
        if (setting.userId !== this.userId) throw new Error('Queue user mismatch');
        const { data, error } = await supabase
          .from('app_settings')
          .upsert(
            {
              key: setting.key,
              value: setting.value,
              updated_at: setting.updatedAt,
            },
            { onConflict: 'user_id,key' },
          )
          .select('*')
          .single();
        if (error) throw error;
        await this.repositories.settings.applyRemoteSetting(
          cloudSetting(data),
          operation.id,
        );
      }
    }
  }

  private async pullAll(): Promise<void> {
    const supabase = getSupabaseClient();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', this.userId)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      for (const row of data) {
        await this.repositories.entries.applyRemote(cloudFoodEntry(row));
      }
      if (data.length < PAGE_SIZE) break;
    }

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('presets')
        .select('*')
        .eq('user_id', this.userId)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      for (const row of data) {
        await this.repositories.presets.applyRemote(cloudPreset(row));
      }
      if (data.length < PAGE_SIZE) break;
    }

    const goalsResult = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();
    if (goalsResult.error) throw goalsResult.error;
    if (goalsResult.data) {
      await this.repositories.settings.applyRemoteGoals(
        cloudGoals(goalsResult.data),
      );
    }

    const settingsResult = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', this.userId)
      .eq('key', 'success_rule_version');
    if (settingsResult.error) throw settingsResult.error;
    for (const row of settingsResult.data) {
      await this.repositories.settings.applyRemoteSetting(cloudSetting(row));
    }
  }

  private async publishStatus(
    phase: SyncStatus['phase'],
  ): Promise<SyncStatus> {
    this.status = await this.repositories.syncQueue.getStatus(phase);
    for (const listener of this.listeners) listener(this.status);
    return this.status;
  }
}
