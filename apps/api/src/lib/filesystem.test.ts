import { mkdtempSync } from 'node:fs';
import { realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDirectorySymlink, ensureDirectory } from './filesystem';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const target = tempDirs.pop();
    if (target) {
      await rm(target, { recursive: true, force: true });
    }
  }
});

describe('filesystem helpers', () => {
  it('recreates a broken directory link target', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'skill-manager-filesystem-'));
    tempDirs.push(tempRoot);

    const originalSource = join(tempRoot, 'source-a');
    const replacementSource = join(tempRoot, 'source-b');
    const targetLink = join(tempRoot, 'links', 'skills');

    await ensureDirectory(originalSource);
    await ensureDirectory(replacementSource);
    await createDirectorySymlink(originalSource, targetLink);

    await rm(originalSource, { recursive: true, force: true });
    await createDirectorySymlink(replacementSource, targetLink);

    expect(await realpath(targetLink)).toBe(resolve(replacementSource));
  });

  it('throws a clear error when the target path already exists', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'skill-manager-filesystem-'));
    tempDirs.push(tempRoot);

    const sourcePath = join(tempRoot, 'source');
    const existingTargetPath = join(tempRoot, 'existing-target');

    await ensureDirectory(sourcePath);
    await ensureDirectory(existingTargetPath);

    await expect(createDirectorySymlink(sourcePath, existingTargetPath)).rejects.toThrow(
      `目标路径已存在，无法创建链接：${existingTargetPath}`
    );
  });
});
