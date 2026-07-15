export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type FoodEntryRow = {
  id: string;
  user_id: string;
  local_date: string;
  logged_at: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: 'manual' | 'preset' | 'ai_text' | 'ai_photo';
  preset_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type PresetRow = {
  id: string;
  user_id: string;
  name: string;
  kind: 'meal' | 'item' | 'portion';
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
};

type DailyGoalsRow = {
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  updated_at: string;
};

type AppSettingRow = {
  user_id: string;
  key: string;
  value: string;
  updated_at: string;
};

type AiUsageEventRow = {
  id: string;
  user_id: string;
  created_at: string;
  estimation_source: 'text' | 'photo';
  model: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  estimated_cost_micros_usd: number;
  pricing_version: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      food_entries: TableDefinition<
        FoodEntryRow,
        Omit<FoodEntryRow, 'user_id'> & { user_id?: string },
        Partial<Omit<FoodEntryRow, 'id' | 'user_id'>>
      >;
      presets: TableDefinition<
        PresetRow,
        Omit<PresetRow, 'user_id'> & { user_id?: string },
        Partial<Omit<PresetRow, 'id' | 'user_id'>>
      >;
      daily_goals: TableDefinition<
        DailyGoalsRow,
        Omit<DailyGoalsRow, 'user_id'> & { user_id?: string },
        Partial<Omit<DailyGoalsRow, 'user_id'>>
      >;
      app_settings: TableDefinition<
        AppSettingRow,
        Omit<AppSettingRow, 'user_id'> & { user_id?: string },
        Partial<Omit<AppSettingRow, 'user_id' | 'key'>>
      >;
      ai_usage_events: TableDefinition<AiUsageEventRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type CloudFoodEntry = FoodEntryRow;
export type CloudPreset = PresetRow;
export type CloudDailyGoals = DailyGoalsRow;
export type CloudAppSetting = AppSettingRow;
export type CloudAiUsageEvent = AiUsageEventRow;
