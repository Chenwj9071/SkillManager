import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { getDefaultDirectories } from './default-directories';

describe('getDefaultDirectories', () => {
  it('returns claude, codex, and cursor defaults for a project root', () => {
    const directories = getDefaultDirectories('/workspace/demo', '/home/user');

    expect(directories.map((item) => item.path)).toContain(join('/workspace/demo', '.claude', 'skills'));
    expect(directories.map((item) => item.path)).toContain(join('/workspace/demo', '.agents', 'skills'));
    expect(directories.map((item) => item.path)).toContain(join('/workspace/demo', '.cursor', 'rules'));
    expect(directories.map((item) => item.path)).toContain(join('/home/user', '.cursor', 'rules'));
  });
});
