import type { DatabaseSync } from 'node:sqlite';
import type { NormalizedSkill } from '@skill-manager/shared';

function toFlag(value: boolean) {
  return value ? 1 : 0;
}

function fromRow(row: Record<string, unknown>): NormalizedSkill {
  return {
    id: String(row.id),
    directoryId: String(row.directory_id),
    toolType: row.tool_type as NormalizedSkill['toolType'],
    rootPath: String(row.root_path),
    skillPath: String(row.skill_path),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    summary: String(row.summary),
    availabilityMode: row.availability_mode as NormalizedSkill['availabilityMode'],
    exists: Number(row.exists_flag) === 1,
    isSymlink: Number(row.is_symlink) === 1,
    symlinkTarget: row.symlink_target ? String(row.symlink_target) : null,
    broken: Number(row.broken) === 1,
    warnings: JSON.parse(String(row.warnings_json)),
    frontmatter: JSON.parse(String(row.frontmatter_json)),
    codexConfig: row.codex_json ? JSON.parse(String(row.codex_json)) : null,
    lastModifiedAt: String(row.last_modified_at)
  };
}

export function createSkillRepository(db: DatabaseSync) {
  const deleteStmt = db.prepare('DELETE FROM skills');
  const insertStmt = db.prepare(`
    INSERT INTO skills (
      id, directory_id, tool_type, root_path, skill_path, slug, name, description,
      summary, availability_mode, exists_flag, is_symlink, symlink_target, broken,
      warnings_json, frontmatter_json, codex_json, last_modified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const listStmt = db.prepare('SELECT * FROM skills ORDER BY tool_type, name');
  const findStmt = db.prepare('SELECT * FROM skills WHERE id = ?');

  return {
    replaceIndex(skills: NormalizedSkill[]) {
      deleteStmt.run();
      for (const skill of skills) {
        insertStmt.run(
          skill.id,
          skill.directoryId,
          skill.toolType,
          skill.rootPath,
          skill.skillPath,
          skill.slug,
          skill.name,
          skill.description,
          skill.summary,
          skill.availabilityMode,
          toFlag(skill.exists),
          toFlag(skill.isSymlink),
          skill.symlinkTarget,
          toFlag(skill.broken),
          JSON.stringify(skill.warnings),
          JSON.stringify(skill.frontmatter),
          skill.codexConfig ? JSON.stringify(skill.codexConfig) : null,
          skill.lastModifiedAt
        );
      }
    },

    listAll(): NormalizedSkill[] {
      return (listStmt.all() as Array<Record<string, unknown>>).map(fromRow);
    },

    findById(id: string): NormalizedSkill | null {
      const row = findStmt.get(id) as Record<string, unknown> | undefined;
      return row ? fromRow(row) : null;
    }
  };
}
