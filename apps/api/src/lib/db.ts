import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getDataDir } from './paths';

export function createDatabase(filename: string) {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const db = new DatabaseSync(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS directories (
      id TEXT PRIMARY KEY,
      tool_type TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      scope TEXT NOT NULL,
      is_default INTEGER NOT NULL,
      exists_flag INTEGER NOT NULL DEFAULT 0,
      is_symlink INTEGER NOT NULL DEFAULT 0,
      symlink_target TEXT
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      directory_id TEXT NOT NULL,
      tool_type TEXT NOT NULL,
      root_path TEXT NOT NULL,
      skill_path TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      summary TEXT NOT NULL,
      availability_mode TEXT NOT NULL,
      exists_flag INTEGER NOT NULL,
      is_symlink INTEGER NOT NULL,
      symlink_target TEXT,
      broken INTEGER NOT NULL,
      warnings_json TEXT NOT NULL,
      frontmatter_json TEXT NOT NULL,
      codex_json TEXT,
      last_modified_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_path TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export function createAppDatabase() {
  return createDatabase(`${getDataDir()}/skill-manager.db`);
}
