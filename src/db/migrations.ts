import type { SQLiteDatabase } from 'expo-sqlite';

interface Migration {
  version: number;
  up: (database: SQLiteDatabase) => Promise<void>;
}

const migrations: readonly Migration[] = [
  {
    version: 1,
    up: async (database) => {
      await database.execAsync(`
        CREATE TABLE food_entries (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          local_date TEXT NOT NULL,
          logged_at TEXT NOT NULL,
          name TEXT NOT NULL,
          calories INTEGER NOT NULL CHECK (calories >= 0),
          protein_g REAL NOT NULL CHECK (protein_g >= 0),
          carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
          fat_g REAL NOT NULL CHECK (fat_g >= 0),
          source TEXT NOT NULL CHECK (
            source IN ('manual', 'preset', 'ai_text', 'ai_photo')
          ),
          preset_id TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          remote_updated_at TEXT,
          PRIMARY KEY (user_id, id)
        );

        CREATE INDEX idx_local_food_entries_user_date_logged_at
          ON food_entries (user_id, local_date, logged_at DESC);
        CREATE INDEX idx_local_food_entries_user_date
          ON food_entries (user_id, local_date);

        CREATE TABLE presets (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('meal', 'item', 'portion')),
          serving_label TEXT,
          calories INTEGER NOT NULL CHECK (calories >= 0),
          protein_g REAL NOT NULL CHECK (protein_g >= 0),
          carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
          fat_g REAL NOT NULL CHECK (fat_g >= 0),
          is_favorite INTEGER NOT NULL CHECK (is_favorite IN (0, 1)),
          sort_order INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          remote_updated_at TEXT,
          PRIMARY KEY (user_id, id)
        );

        CREATE INDEX idx_local_presets_user_favorite_sort
          ON presets (
            user_id,
            is_favorite DESC,
            sort_order ASC,
            name COLLATE NOCASE ASC
          );

        CREATE TABLE daily_goals (
          user_id TEXT PRIMARY KEY NOT NULL,
          calories INTEGER NOT NULL CHECK (calories >= 0),
          protein_g REAL NOT NULL CHECK (protein_g >= 0),
          carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
          fat_g REAL NOT NULL CHECK (fat_g >= 0),
          updated_at TEXT NOT NULL,
          remote_updated_at TEXT
        );

        CREATE TABLE app_settings (
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          remote_updated_at TEXT,
          PRIMARY KEY (user_id, key)
        );

        CREATE TABLE sync_operations (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          entity_type TEXT NOT NULL CHECK (
            entity_type IN (
              'food_entry',
              'preset',
              'daily_goals',
              'app_setting'
            )
          ),
          entity_id TEXT NOT NULL,
          operation_type TEXT NOT NULL CHECK (
            operation_type IN ('upsert', 'delete')
          ),
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT,
          last_error TEXT,
          UNIQUE (user_id, entity_type, entity_id)
        );

        CREATE INDEX idx_sync_operations_user_created
          ON sync_operations (user_id, created_at ASC, id ASC);

        CREATE TABLE sync_state (
          user_id TEXT PRIMARY KEY NOT NULL,
          last_successful_sync_at TEXT,
          last_error TEXT
        );
      `);
    },
  },
];

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  let currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    if (migration.version !== currentVersion + 1) {
      throw new Error(
        `Missing SQLite migration between ${currentVersion} and ${migration.version}`,
      );
    }
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await migration.up(transaction);
      await transaction.execAsync(
        `PRAGMA user_version = ${migration.version}`,
      );
    });
    currentVersion = migration.version;
  }
}
