import type { DatabaseSync } from 'node:sqlite';
import type { ActivityLog } from '@skill-manager/shared';
import { makeId } from '../paths';

function mapRow(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    action: String(row.action),
    targetType: String(row.target_type),
    targetPath: String(row.target_path),
    detail: JSON.parse(String(row.detail_json)),
    createdAt: String(row.created_at)
  };
}

export function createLogRepository(db: DatabaseSync) {
  const insertStmt = db.prepare(`
    INSERT INTO activity_logs (id, action, target_type, target_path, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const listStmt = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100');
  const listAllStmt = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC');
  const clearStmt = db.prepare('DELETE FROM activity_logs');
  const findStmt = db.prepare('SELECT * FROM activity_logs WHERE id = ?');

  return {
    log(action: string, targetType: string, targetPath: string, detail: Record<string, unknown>) {
      insertStmt.run(
        makeId('log'),
        action,
        targetType,
        targetPath,
        JSON.stringify(detail),
        new Date().toISOString()
      );
    },

    listAll(): ActivityLog[] {
      return (listStmt.all() as Array<Record<string, unknown>>).map(mapRow);
    },

    listForExport(): ActivityLog[] {
      return (listAllStmt.all() as Array<Record<string, unknown>>).map(mapRow);
    },

    findById(id: string): ActivityLog | null {
      const row = findStmt.get(id) as Record<string, unknown> | undefined;
      return row ? mapRow(row) : null;
    },

    clearAll() {
      clearStmt.run();
    }
  };
}
