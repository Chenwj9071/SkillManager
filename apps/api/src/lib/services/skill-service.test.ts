import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSkillService } from './skill-service';

let tempDataDir = '';

describe('skill service', () => {
  beforeEach(() => {
    tempDataDir = mkdtempSync(join(tmpdir(), 'skill-manager-service-test-'));
    process.env.SKILL_MANAGER_DATA_DIR = tempDataDir;
  });

  afterEach(async () => {
    delete process.env.SKILL_MANAGER_DATA_DIR;
    tempDataDir = '';
  });

  it('rescans directories and returns normalized skills', async () => {
    const service = buildSkillService();
    const result = await service.rescan();

    expect(Array.isArray(result.skills)).toBe(true);
  });
});
