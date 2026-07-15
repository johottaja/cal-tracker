import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { UserId } from '../domain';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'cal-tracker.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function initializeDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await runMigrations(database);
      return database;
    });
    databasePromise.catch(() => {
      databasePromise = null;
    });
  }
  return databasePromise;
}

export function getDatabase(): Promise<SQLiteDatabase> {
  return initializeDatabase();
}

export async function closeDatabase(): Promise<void> {
  if (!databasePromise) return;
  const database = await databasePromise;
  databasePromise = null;
  await database.closeAsync();
}

export async function clearLocalUserData(userId: UserId): Promise<void> {
  const database = await getDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'DELETE FROM food_entries WHERE user_id = ?',
      userId,
    );
    await transaction.runAsync('DELETE FROM presets WHERE user_id = ?', userId);
    await transaction.runAsync(
      'DELETE FROM daily_goals WHERE user_id = ?',
      userId,
    );
    await transaction.runAsync(
      'DELETE FROM app_settings WHERE user_id = ?',
      userId,
    );
    await transaction.runAsync(
      'DELETE FROM sync_operations WHERE user_id = ?',
      userId,
    );
    await transaction.runAsync(
      'DELETE FROM sync_state WHERE user_id = ?',
      userId,
    );
  });
}
