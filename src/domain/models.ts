export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type LocalDate = Brand<string, 'LocalDate'>;
export type UtcTimestamp = Brand<string, 'UtcTimestamp'>;
export type UserId = Brand<string, 'UserId'>;

export interface MacroValues {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export type MacroKey = keyof MacroValues;
export type FoodEntrySource = 'manual' | 'preset' | 'ai_text' | 'ai_photo';

export interface FoodEntry extends MacroValues {
  id: string;
  userId: UserId;
  localDate: LocalDate;
  loggedAt: UtcTimestamp;
  name: string;
  source: FoodEntrySource;
  presetId: string | null;
  notes: string | null;
  createdAt: UtcTimestamp;
  updatedAt: UtcTimestamp;
  deletedAt: UtcTimestamp | null;
  remoteUpdatedAt: UtcTimestamp | null;
}

export interface CreateFoodEntryInput extends MacroValues {
  id?: string;
  localDate: LocalDate;
  loggedAt?: UtcTimestamp;
  name: string;
  source: FoodEntrySource;
  presetId?: string | null;
  notes?: string | null;
}

export type UpdateFoodEntryInput = Partial<
  Pick<
    FoodEntry,
    | 'localDate'
    | 'loggedAt'
    | 'name'
    | 'calories'
    | 'proteinG'
    | 'carbsG'
    | 'fatG'
    | 'source'
    | 'presetId'
    | 'notes'
  >
>;

export type PresetKind = 'meal' | 'item' | 'portion';

export interface Preset extends MacroValues {
  id: string;
  userId: UserId;
  name: string;
  kind: PresetKind;
  servingLabel: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: UtcTimestamp;
  updatedAt: UtcTimestamp;
  deletedAt: UtcTimestamp | null;
  remoteUpdatedAt: UtcTimestamp | null;
}

export interface CreatePresetInput extends MacroValues {
  id?: string;
  name: string;
  kind: PresetKind;
  servingLabel?: string | null;
  isFavorite?: boolean;
  sortOrder?: number;
}

export type UpdatePresetInput = Partial<
  Pick<
    Preset,
    | 'name'
    | 'kind'
    | 'servingLabel'
    | 'calories'
    | 'proteinG'
    | 'carbsG'
    | 'fatG'
    | 'isFavorite'
    | 'sortOrder'
  >
>;

export interface DailyGoals extends MacroValues {
  userId: UserId;
  updatedAt: UtcTimestamp;
  remoteUpdatedAt: UtcTimestamp | null;
}

export type UpdateDailyGoalsInput = MacroValues;

export const SETTING_KEYS = ['success_rule_version'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export interface SettingValueMap {
  success_rule_version: '1';
}

export interface AppSetting<K extends SettingKey = SettingKey> {
  userId: UserId;
  key: K;
  value: SettingValueMap[K];
  updatedAt: UtcTimestamp;
  remoteUpdatedAt: UtcTimestamp | null;
}

export interface DailyTotal extends MacroValues {
  localDate: LocalDate;
}

export interface HistoryDay extends DailyTotal {
  hasData: boolean;
}

export type SuccessState = 'met' | 'not_met' | 'no_data';

export type SyncEntityType =
  | 'food_entry'
  | 'preset'
  | 'daily_goals'
  | 'app_setting';
export type SyncOperationType = 'upsert' | 'delete';

export interface SyncOperation {
  id: string;
  userId: UserId;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: string;
  createdAt: UtcTimestamp;
  attemptCount: number;
  lastAttemptAt: UtcTimestamp | null;
  lastError: string | null;
}

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  pendingCount: number;
  lastSuccessfulSyncAt: UtcTimestamp | null;
  lastError: string | null;
}

export interface NutritionEstimate extends MacroValues {
  name: string;
  confidence: 'low' | 'medium' | 'high';
  assumptions: string;
}

export interface AiCostSummary {
  monthCostMicrosUsd: number;
  yearCostMicrosUsd: number;
  refreshedAt: UtcTimestamp;
}
