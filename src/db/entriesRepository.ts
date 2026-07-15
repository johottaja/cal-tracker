import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createId,
  normalizeMacroValues,
  normalizeOptionalText,
  normalizeRequiredText,
  nowUtc,
  type CreateFoodEntryInput,
  type DailyTotal,
  type FoodEntry,
  type LocalDate,
  type UpdateFoodEntryInput,
  type UserId,
} from '../domain';
import {
  type FoodEntryRow,
  mapFoodEntry,
} from './rowMappers';
import {
  deleteSyncOperationIfCurrent,
  enqueueSyncOperation,
  getCurrentSyncOperation,
  type SqlExecutor,
} from './syncQueueRepository';

async function upsertEntry(
  executor: SqlExecutor,
  entry: FoodEntry,
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO food_entries (
      id, user_id, local_date, logged_at, name, calories, protein_g, carbs_g,
      fat_g, source, preset_id, notes, created_at, updated_at, deleted_at,
      remote_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, id) DO UPDATE SET
      local_date = excluded.local_date,
      logged_at = excluded.logged_at,
      name = excluded.name,
      calories = excluded.calories,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      source = excluded.source,
      preset_id = excluded.preset_id,
      notes = excluded.notes,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      remote_updated_at = excluded.remote_updated_at`,
    entry.id,
    entry.userId,
    entry.localDate,
    entry.loggedAt,
    entry.name,
    entry.calories,
    entry.proteinG,
    entry.carbsG,
    entry.fatG,
    entry.source,
    entry.presetId,
    entry.notes,
    entry.createdAt,
    entry.updatedAt,
    entry.deletedAt,
    entry.remoteUpdatedAt,
  );
}

function pendingTimestamp(payload: string): number | null {
  try {
    const value = JSON.parse(payload) as {
      updatedAt?: unknown;
      deletedAt?: unknown;
    };
    const timestamp =
      typeof value.deletedAt === 'string'
        ? value.deletedAt
        : typeof value.updatedAt === 'string'
          ? value.updatedAt
          : null;
    if (!timestamp) return null;
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export class EntriesRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly userId: UserId,
  ) {}

  async listEntriesForDate(localDate: LocalDate): Promise<FoodEntry[]> {
    const rows = await this.database.getAllAsync<FoodEntryRow>(
      `SELECT * FROM food_entries
       WHERE user_id = ? AND local_date = ? AND deleted_at IS NULL
       ORDER BY logged_at DESC, id ASC`,
      this.userId,
      localDate,
    );
    return rows.map(mapFoodEntry);
  }

  async getEntryById(id: string): Promise<FoodEntry | null> {
    const row = await this.database.getFirstAsync<FoodEntryRow>(
      `SELECT * FROM food_entries
       WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      this.userId,
      id,
    );
    return row ? mapFoodEntry(row) : null;
  }

  async createEntry(input: CreateFoodEntryInput): Promise<FoodEntry> {
    const timestamp = nowUtc();
    const macros = normalizeMacroValues(input);
    const entry: FoodEntry = {
      id: input.id ?? createId(),
      userId: this.userId,
      localDate: input.localDate,
      loggedAt: input.loggedAt ?? timestamp,
      name: normalizeRequiredText(input.name, 'Entry name'),
      ...macros,
      source: input.source,
      presetId: input.presetId ?? null,
      notes: normalizeOptionalText(input.notes),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await upsertEntry(transaction, entry);
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'food_entry',
        entityId: entry.id,
        operationType: 'upsert',
        payload: JSON.stringify(entry),
        createdAt: timestamp,
      });
    });
    return entry;
  }

  async updateEntry(
    id: string,
    input: UpdateFoodEntryInput,
  ): Promise<FoodEntry> {
    const current = await this.getEntryById(id);
    if (!current) throw new Error('Food entry not found');
    const timestamp = nowUtc();
    const macros = normalizeMacroValues({
      calories: input.calories ?? current.calories,
      proteinG: input.proteinG ?? current.proteinG,
      carbsG: input.carbsG ?? current.carbsG,
      fatG: input.fatG ?? current.fatG,
    });
    const updated: FoodEntry = {
      ...current,
      ...macros,
      localDate: input.localDate ?? current.localDate,
      loggedAt: input.loggedAt ?? current.loggedAt,
      name:
        input.name === undefined
          ? current.name
          : normalizeRequiredText(input.name, 'Entry name'),
      source: input.source ?? current.source,
      presetId:
        input.presetId === undefined ? current.presetId : input.presetId,
      notes:
        input.notes === undefined
          ? current.notes
          : normalizeOptionalText(input.notes),
      updatedAt: timestamp,
      deletedAt: null,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await upsertEntry(transaction, updated);
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'food_entry',
        entityId: id,
        operationType: 'upsert',
        payload: JSON.stringify(updated),
        createdAt: timestamp,
      });
    });
    return updated;
  }

  async deleteEntry(id: string): Promise<void> {
    const current = await this.getEntryById(id);
    if (!current) return;
    const timestamp = nowUtc();
    const tombstone: FoodEntry = {
      ...current,
      updatedAt: timestamp,
      deletedAt: timestamp,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        'DELETE FROM food_entries WHERE user_id = ? AND id = ?',
        this.userId,
        id,
      );
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'food_entry',
        entityId: id,
        operationType: 'delete',
        payload: JSON.stringify(tombstone),
        createdAt: timestamp,
      });
    });
  }

  async getDailyTotals(
    startDate: LocalDate,
    endDate: LocalDate,
  ): Promise<DailyTotal[]> {
    if (startDate > endDate) throw new Error('Invalid date range');
    const rows = await this.database.getAllAsync<{
      local_date: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }>(
      `SELECT
         local_date,
         COALESCE(SUM(calories), 0) AS calories,
         COALESCE(SUM(protein_g), 0) AS protein_g,
         COALESCE(SUM(carbs_g), 0) AS carbs_g,
         COALESCE(SUM(fat_g), 0) AS fat_g
       FROM food_entries
       WHERE user_id = ?
         AND local_date BETWEEN ? AND ?
         AND deleted_at IS NULL
       GROUP BY local_date
       ORDER BY local_date ASC`,
      this.userId,
      startDate,
      endDate,
    );
    return rows.map((row) => ({
      localDate: row.local_date as LocalDate,
      calories: row.calories,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
    }));
  }

  async applyRemote(
    remote: FoodEntry,
    acknowledgedOperationId?: string,
  ): Promise<boolean> {
    if (remote.userId !== this.userId) throw new Error('User mismatch');
    let applied = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const pending = await getCurrentSyncOperation(
        transaction,
        this.userId,
        'food_entry',
        remote.id,
      );
      if (acknowledgedOperationId) {
        if (pending?.id !== acknowledgedOperationId) return;
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'food_entry',
          remote.id,
          acknowledgedOperationId,
        );
      } else if (pending) {
        const localTime = pendingTimestamp(pending.payload);
        const remoteTime = Date.parse(remote.deletedAt ?? remote.updatedAt);
        if (localTime === null || localTime > remoteTime) return;
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'food_entry',
          remote.id,
          pending.id,
        );
      }

      if (remote.deletedAt) {
        await transaction.runAsync(
          'DELETE FROM food_entries WHERE user_id = ? AND id = ?',
          this.userId,
          remote.id,
        );
      } else {
        await upsertEntry(transaction, {
          ...remote,
          remoteUpdatedAt: remote.updatedAt,
        });
      }
      applied = true;
    });
    return applied;
  }
}
