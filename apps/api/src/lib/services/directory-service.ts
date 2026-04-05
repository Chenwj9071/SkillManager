import { mkdirSync } from 'node:fs';
import type { AddDirectoryInput } from '@skill-manager/shared';
import { getDefaultDirectories } from '../default-directories';
import { getHomeDir, getProjectRoot } from '../paths';
import { createDirectoryRepository } from '../repositories/directory-repository';
import { createLogRepository } from '../repositories/log-repository';
import { createAppDatabase } from '../db';

function syncDefaultDirectories(directoryRepository: ReturnType<typeof createDirectoryRepository>) {
  directoryRepository.upsertDefaults(getDefaultDirectories(getProjectRoot(), getHomeDir()));
}

export function buildDirectoryService() {
  const db = createAppDatabase();
  const directoryRepository = createDirectoryRepository(db);
  const logRepository = createLogRepository(db);

  syncDefaultDirectories(directoryRepository);

  return {
    listDirectories() {
      syncDefaultDirectories(directoryRepository);
      return directoryRepository.listAll();
    },

    addDirectory(input: AddDirectoryInput) {
      mkdirSync(input.path, { recursive: true });
      const directory = directoryRepository.addCustomDirectory(input);
      logRepository.log('directory.added', 'directory', directory.path, {
        toolType: directory.toolType
      });
      return directory;
    },

    deleteDirectory(id: string) {
      const target = directoryRepository.listAll().find((directory) => directory.id === id);
      directoryRepository.deleteCustomDirectory(id);
      if (target) {
        logRepository.log('directory.deleted', 'directory', target.path, {});
      }
    }
  };
}
