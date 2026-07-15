import type { SQLiteDatabase } from 'expo-sqlite';

import {
  asUtcTimestamp,
  createId,
  nowUtc,
  type SyncEntityType,
  type SyncOperation,
  type SyncOperationType,
  type SyncStatus,
  type UserId,
  type UtcTimestamp,
} from '../domain';

export type SqlExecutor = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

interface SyncOperationRow {
  id: string;
  user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation_type: SyncOperationType;
  payload: string;
  created_at: string;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error: string | null;
}

function mapOperation(row: SyncOperationRow): SyncOperation {
  return {
    id: row.id,
    userId: row.user_id as UserId,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operationType: row.operation_type,
    payload: row.payload,
    createdAt: asUtcTimestamp(row.created_at),
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at
      ? asUtcTimestamp(row.last_attempt_at)
      : null,
    lastError: row.last_error,
  };
}

export async function enqueueSyncOperation(
  executor: SqlExecutor,
  input: {
    userId: UserId;
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    payload: string;
    createdAt?: UtcTimestamp;
  },
): Promise<string> {
  const id = createId();
  const createdAt = input.createdAt ?? nowUtc();
  await executor.runAsync(
    `INSERT INTO sync_operations (
      id, user_id, entity_type, entity_id, operation_type, payload, created_at,
      attempt_count, last_attempt_at, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)
    ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
      id = excluded.id,
      operation_type = excluded.operation_type,
      payload = excluded.payload,
      created_at = excluded.created_at,
      attempt_count = 0,
      last_attempt_at = NULL,
      last_error = NULL`,
    id,
    input.userId,
    input.entityType,
    input.entityId,
    input.operationType,
    input.payload,
    createdAt,
  );
  return id;
}

export async function getCurrentSyncOperation(
  executor: SqlExecutor,
  userId: UserId,
  entityType: SyncEntityType,
  entityId: string,
): Promise<SyncOperation | null> {
  const row = await executor.getFirstAsync<SyncOperationRow>(
    `SELECT * FROM sync_operations
     WHERE user_id = ? AND entity_type = ? AND entity_id = ?`,
    userId,
    entityType,
    entityId,
  );
  return row ? mapOperation(row) : null;
}

export async function deleteSyncOperationIfCurrent(
  executor: SqlExecutor,
  userId: UserId,
  entityType: SyncEntityType,
  entityId: string,
  operationId: string,
): Promise<boolean> {
  const result = await executor.runAsync(
    `DELETE FROM sync_operations
     WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND id = ?`,
    userId,
    entityType,
    entityId,
    operationId,
  );
  return result.changes > 0;
}

export class SyncQueueRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly userId: UserId,
  ) {}

  async listPending(limit = 100): Promise<SyncOperation[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const rows = await this.database.getAllAsync<SyncOperationRow>(
      `SELECT * FROM sync_operations
       WHERE user_id = ?
       ORDER BY created_at ASC, id ASC
       LIMIT ?`,
      this.userId,
      safeLimit,
    );
    return rows.map(mapOperation);
  }

  async getPendingCount(): Promise<number> {
    const row = await this.database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_operations WHERE user_id = ?`,
      this.userId,
    );
    return row?.count ?? 0;
  }

  async markAttempt(operationId: string, error: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE sync_operations
       SET attempt_count = attempt_count + 1,
           last_attempt_at = ?,
           last_error = ?
       WHERE id = ? AND user_id = ?`,
      nowUtc(),
      error.slice(0, 500),
      operationId,
      this.userId,
    );
  }

  async recordSuccessfulSync(timestamp = nowUtc()): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO sync_state (user_id, last_successful_sync_at, last_error)
       VALUES (?, ?, NULL)
       ON CONFLICT (user_id) DO UPDATE SET
         last_successful_sync_at = excluded.last_successful_sync_at,
         last_error = NULL`,
      this.userId,
      timestamp,
    );
  }

  async recordSyncError(error: string): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO sync_state (user_id, last_successful_sync_at, last_error)
       VALUES (?, NULL, ?)
       ON CONFLICT (user_id) DO UPDATE SET last_error = excluded.last_error`,
      this.userId,
      error.slice(0, 500),
    );
  }

  async getStatus(
    phase: SyncStatus['phase'] = 'idle',
  ): Promise<SyncStatus> {
    const [pendingCount, state] = await Promise.all([
      this.getPendingCount(),
      this.database.getFirstAsync<{
        last_successful_sync_at: string | null;
        last_error: string | null;
      }>(
        `SELECT last_successful_sync_at, last_error
         FROM sync_state WHERE user_id = ?`,
        this.userId,
      ),
    ]);
    return {
      phase,
      pendingCount,
      lastSuccessfulSyncAt: state?.last_successful_sync_at
        ? asUtcTimestamp(state.last_successful_sync_at)
        : null,
      lastError: state?.last_error ?? null,
    };
  }
}
