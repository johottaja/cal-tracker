import type { SQLiteDatabase } from 'expo-sqlite';

import {
  normalizeMacroValues,
  nowUtc,
  type AppSetting,
  type DailyGoals,
  type SettingKey,
  type SettingValueMap,
  type UpdateDailyGoalsInput,
  type UserId,
} from '../domain';
import {
  mapAppSetting,
  mapDailyGoals,
  type AppSettingRow,
  type DailyGoalsRow,
} from './rowMappers';
import {
  deleteSyncOperationIfCurrent,
  enqueueSyncOperation,
  getCurrentSyncOperation,
  type SqlExecutor,
} from './syncQueueRepository';

async function upsertGoals(
  executor: SqlExecutor,
  goals: DailyGoals,
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO daily_goals (
      user_id, calories, protein_g, carbs_g, fat_g, updated_at,
      remote_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET
      calories = excluded.calories,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      updated_at = excluded.updated_at,
      remote_updated_at = excluded.remote_updated_at`,
    goals.userId,
    goals.calories,
    goals.proteinG,
    goals.carbsG,
    goals.fatG,
    goals.updatedAt,
    goals.remoteUpdatedAt,
  );
}

async function upsertSetting(
  executor: SqlExecutor,
  setting: AppSetting,
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO app_settings (
      user_id, key, value, updated_at, remote_updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (user_id, key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at,
      remote_updated_at = excluded.remote_updated_at`,
    setting.userId,
    setting.key,
    setting.value,
    setting.updatedAt,
    setting.remoteUpdatedAt,
  );
}

function payloadUpdatedAt(payload: string): number | null {
  try {
    const value = JSON.parse(payload) as { updatedAt?: unknown };
    if (typeof value.updatedAt !== 'string') return null;
    const parsed = Date.parse(value.updatedAt);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function validateSettingValue<K extends SettingKey>(
  key: K,
  value: SettingValueMap[K],
): SettingValueMap[K] {
  if (key === 'success_rule_version' && value !== '1') {
    throw new Error('Unsupported success rule version');
  }
  return value;
}

export class SettingsRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly userId: UserId,
  ) {}

  async getDailyGoals(): Promise<DailyGoals | null> {
    const row = await this.database.getFirstAsync<DailyGoalsRow>(
      'SELECT * FROM daily_goals WHERE user_id = ?',
      this.userId,
    );
    return row ? mapDailyGoals(row) : null;
  }

  async updateDailyGoals(input: UpdateDailyGoalsInput): Promise<DailyGoals> {
    const timestamp = nowUtc();
    const goals: DailyGoals = {
      userId: this.userId,
      ...normalizeMacroValues(input),
      updatedAt: timestamp,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await upsertGoals(transaction, goals);
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'daily_goals',
        entityId: this.userId,
        operationType: 'upsert',
        payload: JSON.stringify(goals),
        createdAt: timestamp,
      });
    });
    return goals;
  }

  async getSetting<K extends SettingKey>(
    key: K,
  ): Promise<SettingValueMap[K] | null> {
    const row = await this.database.getFirstAsync<AppSettingRow>(
      `SELECT * FROM app_settings WHERE user_id = ? AND key = ?`,
      this.userId,
      key,
    );
    if (!row) return null;
    return mapAppSetting(row).value as SettingValueMap[K];
  }

  async setSetting<K extends SettingKey>(
    key: K,
    value: SettingValueMap[K],
  ): Promise<AppSetting<K>> {
    const timestamp = nowUtc();
    const setting: AppSetting<K> = {
      userId: this.userId,
      key,
      value: validateSettingValue(key, value),
      updatedAt: timestamp,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await upsertSetting(transaction, setting);
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'app_setting',
        entityId: key,
        operationType: 'upsert',
        payload: JSON.stringify(setting),
        createdAt: timestamp,
      });
    });
    return setting;
  }

  async applyRemoteGoals(
    remote: DailyGoals,
    acknowledgedOperationId?: string,
  ): Promise<boolean> {
    if (remote.userId !== this.userId) throw new Error('User mismatch');
    let applied = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const pending = await getCurrentSyncOperation(
        transaction,
        this.userId,
        'daily_goals',
        this.userId,
      );
      if (acknowledgedOperationId) {
        if (pending?.id !== acknowledgedOperationId) return;
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'daily_goals',
          this.userId,
          acknowledgedOperationId,
        );
      } else if (pending) {
        const localTime = payloadUpdatedAt(pending.payload);
        if (localTime === null || localTime > Date.parse(remote.updatedAt)) {
          return;
        }
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'daily_goals',
          this.userId,
          pending.id,
        );
      }
      await upsertGoals(transaction, {
        ...remote,
        remoteUpdatedAt: remote.updatedAt,
      });
      applied = true;
    });
    return applied;
  }

  async applyRemoteSetting(
    remote: AppSetting,
    acknowledgedOperationId?: string,
  ): Promise<boolean> {
    if (remote.userId !== this.userId) throw new Error('User mismatch');
    let applied = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const pending = await getCurrentSyncOperation(
        transaction,
        this.userId,
        'app_setting',
        remote.key,
      );
      if (acknowledgedOperationId) {
        if (pending?.id !== acknowledgedOperationId) return;
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'app_setting',
          remote.key,
          acknowledgedOperationId,
        );
      } else if (pending) {
        const localTime = payloadUpdatedAt(pending.payload);
        if (localTime === null || localTime > Date.parse(remote.updatedAt)) {
          return;
        }
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'app_setting',
          remote.key,
          pending.id,
        );
      }
      await upsertSetting(transaction, {
        ...remote,
        remoteUpdatedAt: remote.updatedAt,
      });
      applied = true;
    });
    return applied;
  }
}
