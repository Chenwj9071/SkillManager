import { join } from 'node:path';
import type { DirectoryRecord, Scope, ToolType } from '@skill-manager/shared';
import { makeId } from './paths';

function buildDirectory(toolType: ToolType, rootPath: string, scope: Scope): DirectoryRecord {
  return {
    id: makeId('dir'),
    toolType,
    path: rootPath,
    scope,
    isDefault: true,
    exists: false,
    isSymlink: false,
    symlinkTarget: null
  };
}

export function getDefaultDirectories(projectRoot: string, homeDir: string): DirectoryRecord[] {
  return [
    buildDirectory('claude', join(homeDir, '.claude', 'skills'), 'user'),
    buildDirectory('claude', join(projectRoot, '.claude', 'skills'), 'project'),
    buildDirectory('codex', join(homeDir, '.agents', 'skills'), 'user'),
    buildDirectory('codex', join(projectRoot, '.agents', 'skills'), 'project'),
    buildDirectory('codex', join(projectRoot, '.agent', 'skills'), 'project'),
    buildDirectory('cursor', join(homeDir, '.cursor', 'rules'), 'user'),
    buildDirectory('cursor', join(projectRoot, '.cursor', 'rules'), 'project')
  ];
}
