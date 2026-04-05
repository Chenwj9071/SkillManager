import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { scanSkillRoot } from './skill-scanner';

describe('scanSkillRoot', () => {
  it('discovers child directories containing SKILL.md', async () => {
    const skills = await scanSkillRoot(
      join(process.cwd(), 'apps/api/src/test/fixtures/skills-root'),
      {
        rootPath: join(process.cwd(), 'apps/api/src/test/fixtures/skills-root'),
        toolType: 'generic',
        scope: 'custom',
        isDefault: false
      }
    );

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('fixture-skill');
  });
});
