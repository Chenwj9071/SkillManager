import { existsSync, lstatSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import type { AddDirectoryInput, DirectoryRecord } from '@skill-manager/shared';
import { makeId } from '../paths';

function mapRow(row: Record<string, unknown>): DirectoryRecord {
  return {
    id: String(row.id),
    toolType: row.tool_type as DirectoryRecord['toolType'],
    path: String(row.path),
    scope: row.scope as DirectoryRecord['scope'],
    isDefault: Number(row.is_default) === 1,
    exists: Number(row.exists_flag) === 1,
    isSymlink: Number(row.is_symlink) === 1,
    symlinkTarget: row.symlink_target ? String(row.symlink_target) : null
  };
}

function getStatus(directoryPath: string) {
  if (!existsSync(directoryPath)) {
    return { exists: 0, isSymlink: 0, symlinkTarget: null };
  }

  const stats = lstatSync(directoryPath);
  return {
    exists: 1,
    isSymlink: stats.isSymbolicLink() ? 1 : 0,
    symlinkTarget: null
  };
}

export function createDirectoryRepository(db: DatabaseSync) {
  const listStmt = db.prepare('SELECT * FROM directories ORDER BY is_default DESC, tool_type, path');
  const upsertStmt = db.prepare(`
    INSERT INTO directories (id, tool_type, path, scope, is_default, exists_flag, is_symlink, symlink_target)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      tool_type = excluded.tool_type,
      scope = excluded.scope,
      is_default = excluded.is_default,
      exists_flag = excluded.exists_flag,
      is_symlink = excluded.is_symlink,
      symlink_target = excluded.symlink_target
  `);
  const deleteStmt = db.prepare('DELETE FROM directories WHERE id = ? AND is_default = 0');

  return {
    listAll(): DirectoryRecord[] {
      return (listStmt.all() as Array<Record<string, unknown>>).map(mapRow);
    },

    upsertDefaults(directories: DirectoryRecord[]) {
      for (const directory of directories) {
        const status = getStatus(directory.path);
        upsertStmt.run(
          directory.id,
          directory.toolType,
          directory.path,
          directory.scope,
          1,
          status.exists,
          status.isSymlink,
          status.symlinkTarget
        );
      }
    },

    addCustomDirectory(input: AddDirectoryInput): DirectoryRecord {
      const id = makeId('dir');
      const status = getStatus(input.path);
      upsertStmt.run(
        id,
        input.toolType,
        input.path,
        input.scope,
        0,
        status.exists,
        status.isSymlink,
        status.symlinkTarget
      );

      return {
        id,
        toolType: input.toolType,
        path: input.path,
        scope: input.scope,
        isDefault: false,
        exists: status.exists === 1,
        isSymlink: status.isSymlink === 1,
        symlinkTarget: status.symlinkTarget
      };
    },

    deleteCustomDirectory(id: string) {
      deleteStmt.run(id);
    }
  };
}
