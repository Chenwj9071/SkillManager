import { lstat, mkdir, rm, stat, symlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export async function ensureDirectory(targetPath: string) {
  await mkdir(targetPath, { recursive: true });
}

export async function removeDirectoryOrLink(targetPath: string) {
  await rm(targetPath, { recursive: true, force: true });
}

async function removeBrokenLink(targetPath: string) {
  try {
    const targetStats = await lstat(targetPath);
    if (!targetStats.isSymbolicLink()) {
      return;
    }

    try {
      await stat(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }

      await rm(targetPath, { recursive: true, force: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function createDirectorySymlink(sourcePath: string, targetPath: string) {
  await ensureDirectory(dirname(targetPath));
  await removeBrokenLink(targetPath);
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  const normalizedSource = process.platform === 'win32' ? resolve(sourcePath) : sourcePath;

  try {
    await symlink(normalizedSource, targetPath, linkType);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`目标路径已存在，无法创建链接：${targetPath}`);
    }

    throw error;
  }
}
