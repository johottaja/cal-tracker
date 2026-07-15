import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createId,
  normalizeMacroValues,
  normalizeOptionalText,
  normalizeRequiredText,
  nowUtc,
  type CreatePresetInput,
  type Preset,
  type UpdatePresetInput,
  type UserId,
} from '../domain';
import { mapPreset, type PresetRow } from './rowMappers';
import {
  deleteSyncOperationIfCurrent,
  enqueueSyncOperation,
  getCurrentSyncOperation,
  type SqlExecutor,
} from './syncQueueRepository';

async function upsertPreset(
  executor: SqlExecutor,
  preset: Preset,
): Promise<void> {
  await executor.runAsync(
    `INSERT INTO presets (
      id, user_id, name, kind, serving_label, calories, protein_g, carbs_g,
      fat_g, is_favorite, sort_order, created_at, updated_at, deleted_at,
      remote_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, id) DO UPDATE SET
      name = excluded.name,
      kind = excluded.kind,
      serving_label = excluded.serving_label,
      calories = excluded.calories,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      is_favorite = excluded.is_favorite,
      sort_order = excluded.sort_order,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      remote_updated_at = excluded.remote_updated_at`,
    preset.id,
    preset.userId,
    preset.name,
    preset.kind,
    preset.servingLabel,
    preset.calories,
    preset.proteinG,
    preset.carbsG,
    preset.fatG,
    preset.isFavorite ? 1 : 0,
    preset.sortOrder,
    preset.createdAt,
    preset.updatedAt,
    preset.deletedAt,
    preset.remoteUpdatedAt,
  );
}

function getPayloadTime(payload: string): number | null {
  try {
    const value = JSON.parse(payload) as {
      updatedAt?: unknown;
      deletedAt?: unknown;
    };
    const raw =
      typeof value.deletedAt === 'string'
        ? value.deletedAt
        : typeof value.updatedAt === 'string'
          ? value.updatedAt
          : null;
    const parsed = raw ? Date.parse(raw) : Number.NaN;
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export class PresetsRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly userId: UserId,
  ) {}

  async listPresets(options: {
    favoritesOnly?: boolean;
  } = {}): Promise<Preset[]> {
    const favoriteClause = options.favoritesOnly
      ? 'AND is_favorite = 1'
      : '';
    const rows = await this.database.getAllAsync<PresetRow>(
      `SELECT * FROM presets
       WHERE user_id = ? AND deleted_at IS NULL ${favoriteClause}
       ORDER BY is_favorite DESC, sort_order ASC, name COLLATE NOCASE ASC`,
      this.userId,
    );
    return rows.map(mapPreset);
  }

  async getPresetById(id: string): Promise<Preset | null> {
    const row = await this.database.getFirstAsync<PresetRow>(
      `SELECT * FROM presets
       WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      this.userId,
      id,
    );
    return row ? mapPreset(row) : null;
  }

  async createPreset(input: CreatePresetInput): Promise<Preset> {
    const timestamp = nowUtc();
    const macros = normalizeMacroValues(input);
    const preset: Preset = {
      id: input.id ?? createId(),
      userId: this.userId,
      name: normalizeRequiredText(input.name, 'Preset name'),
      kind: input.kind,
      servingLabel: normalizeOptionalText(input.servingLabel, 100),
      ...macros,
      isFavorite: input.isFavorite ?? false,
      sortOrder: Math.trunc(input.sortOrder ?? 0),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await upsertPreset(transaction, preset);
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'preset',
        entityId: preset.id,
        operationType: 'upsert',
        payload: JSON.stringify(preset),
        createdAt: timestamp,
      });
    });
    return preset;
  }

  async updatePreset(id: string, input: UpdatePresetInput): Promise<Preset> {
    const current = await this.getPresetById(id);
    if (!current) throw new Error('Preset not found');
    const timestamp = nowUtc();
    const macros = normalizeMacroValues({
      calories: input.calories ?? current.calories,
      proteinG: input.proteinG ?? current.proteinG,
      carbsG: input.carbsG ?? current.carbsG,
      fatG: input.fatG ?? current.fatG,
    });
    const updated: Preset = {
      ...current,
      ...macros,
      name:
        input.name === undefined
          ? current.name
          : normalizeRequiredText(input.name, 'Preset name'),
      kind: input.kind ?? current.kind,
      servingLabel:
        input.servingLabel === undefined
          ? current.servingLabel
          : normalizeOptionalText(input.servingLabel, 100),
      isFavorite: input.isFavorite ?? current.isFavorite,
      sortOrder:
        input.sortOrder === undefined
          ? current.sortOrder
          : Math.trunc(input.sortOrder),
      updatedAt: timestamp,
      deletedAt: null,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await upsertPreset(transaction, updated);
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'preset',
        entityId: id,
        operationType: 'upsert',
        payload: JSON.stringify(updated),
        createdAt: timestamp,
      });
    });
    return updated;
  }

  async deletePreset(id: string): Promise<void> {
    const current = await this.getPresetById(id);
    if (!current) return;
    const timestamp = nowUtc();
    const tombstone: Preset = {
      ...current,
      updatedAt: timestamp,
      deletedAt: timestamp,
      remoteUpdatedAt: null,
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        'DELETE FROM presets WHERE user_id = ? AND id = ?',
        this.userId,
        id,
      );
      await enqueueSyncOperation(transaction, {
        userId: this.userId,
        entityType: 'preset',
        entityId: id,
        operationType: 'delete',
        payload: JSON.stringify(tombstone),
        createdAt: timestamp,
      });
    });
  }

  setPresetFavorite(id: string, isFavorite: boolean): Promise<Preset> {
    return this.updatePreset(id, { isFavorite });
  }

  async reorderPresets(orderedIds: readonly string[]): Promise<void> {
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new Error('Preset order contains duplicate IDs');
    }
    const timestamp = nowUtc();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const [sortOrder, id] of orderedIds.entries()) {
        const row = await transaction.getFirstAsync<PresetRow>(
          `SELECT * FROM presets
           WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
          this.userId,
          id,
        );
        if (!row) throw new Error(`Preset not found: ${id}`);
        const preset: Preset = {
          ...mapPreset(row),
          sortOrder,
          updatedAt: timestamp,
          remoteUpdatedAt: null,
        };
        await upsertPreset(transaction, preset);
        await enqueueSyncOperation(transaction, {
          userId: this.userId,
          entityType: 'preset',
          entityId: id,
          operationType: 'upsert',
          payload: JSON.stringify(preset),
          createdAt: timestamp,
        });
      }
    });
  }

  async applyRemote(
    remote: Preset,
    acknowledgedOperationId?: string,
  ): Promise<boolean> {
    if (remote.userId !== this.userId) throw new Error('User mismatch');
    let applied = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const pending = await getCurrentSyncOperation(
        transaction,
        this.userId,
        'preset',
        remote.id,
      );
      if (acknowledgedOperationId) {
        if (pending?.id !== acknowledgedOperationId) return;
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'preset',
          remote.id,
          acknowledgedOperationId,
        );
      } else if (pending) {
        const localTime = getPayloadTime(pending.payload);
        const remoteTime = Date.parse(remote.deletedAt ?? remote.updatedAt);
        if (localTime === null || localTime > remoteTime) return;
        await deleteSyncOperationIfCurrent(
          transaction,
          this.userId,
          'preset',
          remote.id,
          pending.id,
        );
      }

      if (remote.deletedAt) {
        await transaction.runAsync(
          'DELETE FROM presets WHERE user_id = ? AND id = ?',
          this.userId,
          remote.id,
        );
      } else {
        await upsertPreset(transaction, {
          ...remote,
          remoteUpdatedAt: remote.updatedAt,
        });
      }
      applied = true;
    });
    return applied;
  }
}
