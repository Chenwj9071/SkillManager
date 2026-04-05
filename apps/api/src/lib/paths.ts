import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

export function getHomeDir() {
  return homedir();
}

export function getProjectRoot() {
  let current = process.cwd();

  while (true) {
    if (existsSync(resolve(current, 'pnpm-workspace.yaml')) || existsSync(resolve(current, '.git'))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return process.cwd();
    }
    current = parent;
  }
}

export function resolveAbsolutePath(inputPath: string) {
  return resolve(inputPath);
}

export function getDataDir() {
  const base = process.env.SKILL_MANAGER_DATA_DIR?.trim();
  return base ? resolve(base) : resolve(getProjectRoot(), '.skill-manager');
}

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
