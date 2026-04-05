import { describe, expect, it } from 'vitest';
import { createDatabase } from './db';

describe('database', () => {
  it('creates required tables', () => {
    const db = createDatabase(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;

    expect(tables.map((item) => item.name)).toContain('directories');
    expect(tables.map((item) => item.name)).toContain('activity_logs');
    db.close();
  });
});
