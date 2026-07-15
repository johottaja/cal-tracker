import type { UserId } from '../domain';
import {
  clearLocalUserData,
  closeDatabase,
  getDatabase,
  initializeDatabase,
} from './database';
import { EntriesRepository } from './entriesRepository';
import { PresetsRepository } from './presetsRepository';
import { SettingsRepository } from './settingsRepository';
import { SyncQueueRepository } from './syncQueueRepository';

export interface LocalRepositories {
  entries: EntriesRepository;
  presets: PresetsRepository;
  settings: SettingsRepository;
  syncQueue: SyncQueueRepository;
}

export async function createLocalRepositories(
  userId: UserId,
): Promise<LocalRepositories> {
  const database = await getDatabase();
  return {
    entries: new EntriesRepository(database, userId),
    presets: new PresetsRepository(database, userId),
    settings: new SettingsRepository(database, userId),
    syncQueue: new SyncQueueRepository(database, userId),
  };
}

export {
  clearLocalUserData,
  closeDatabase,
  EntriesRepository,
  getDatabase,
  initializeDatabase,
  PresetsRepository,
  SettingsRepository,
  SyncQueueRepository,
};
