import { lstat, mkdir, readlink, realpath, rm, stat, symlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface PathState {
  exists: boolean;
  isSymlink: boolean;
  symlinkTarget: string | null;
}

export async function ensureDirectory(targetPath: string) {
  await mkdir(targetPath, { recursive: true });
}

export async function removeDirectoryOrLink(targetPath: string) {
  await rm(targetPath, { recursive: true, force: true });
}

export async function readPathState(targetPath: string): Promise<PathState> {
  try {
    const targetStats = await lstat(targetPath);
    if (!targetStats.isSymbolicLink()) {
      return {
        exists: true,
        isSymlink: false,
        symlinkTarget: null
      };
    }

    try {
      return {
        exists: true,
        isSymlink: true,
        symlinkTarget: await realpath(targetPath)
      };
    } catch {
      try {
        return {
          exists: true,
          isSymlink: true,
          symlinkTarget: await readlink(targetPath)
        };
      } catch {
        return {
          exists: true,
          isSymlink: true,
          symlinkTarget: null
        };
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    return {
      exists: false,
      isSymlink: false,
      symlinkTarget: null
    };
  }
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
