import {
  asLocalDate,
  asUtcTimestamp,
  type AppSetting,
  type DailyGoals,
  type FoodEntry,
  type Preset,
  type SettingKey,
  type UserId,
} from '../domain';

export interface FoodEntryRow {
  id: string;
  user_id: string;
  local_date: string;
  logged_at: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodEntry['source'];
  preset_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  remote_updated_at: string | null;
}

export interface PresetRow {
  id: string;
  user_id: string;
  name: string;
  kind: Preset['kind'];
  serving_label: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_favorite: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  remote_updated_at: string | null;
}

export interface DailyGoalsRow {
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  updated_at: string;
  remote_updated_at: string | null;
}

export interface AppSettingRow {
  user_id: string;
  key: SettingKey;
  value: string;
  updated_at: string;
  remote_updated_at: string | null;
}

export function mapFoodEntry(row: FoodEntryRow): FoodEntry {
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
    remoteUpdatedAt: row.remote_updated_at
      ? asUtcTimestamp(row.remote_updated_at)
      : null,
  };
}

export function mapPreset(row: PresetRow): Preset {
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
    remoteUpdatedAt: row.remote_updated_at
      ? asUtcTimestamp(row.remote_updated_at)
      : null,
  };
}

export function mapDailyGoals(row: DailyGoalsRow): DailyGoals {
  return {
    userId: row.user_id as UserId,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    updatedAt: asUtcTimestamp(row.updated_at),
    remoteUpdatedAt: row.remote_updated_at
      ? asUtcTimestamp(row.remote_updated_at)
      : null,
  };
}

export function mapAppSetting(row: AppSettingRow): AppSetting {
  if (row.key !== 'success_rule_version' || row.value !== '1') {
    throw new Error(`Invalid local setting ${row.key}`);
  }
  return {
    userId: row.user_id as UserId,
    key: row.key,
    value: row.value,
    updatedAt: asUtcTimestamp(row.updated_at),
    remoteUpdatedAt: row.remote_updated_at
      ? asUtcTimestamp(row.remote_updated_at)
      : null,
  };
}
