import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type {
  ActivityLog,
  AvailabilityMode,
  CreateRootLinkInput,
  CreateSkillLinkInput,
  NormalizedSkill,
  ToolType,
  UpdateSkillMetadataInput
} from '@skill-manager/shared';
import { resolveAvailabilityMode } from '../availability';
import { createAppDatabase } from '../db';
import {
  createDirectorySymlink,
  ensureDirectory,
  readPathState,
  removeDirectoryOrLink
} from '../filesystem';
import { getDefaultDirectories } from '../default-directories';
import { getHomeDir, getProjectRoot } from '../paths';
import { parseCodexConfig, parseSkillMarkdown } from '../skill-parser';
import { createDirectoryRepository } from '../repositories/directory-repository';
import { createLogRepository } from '../repositories/log-repository';
import { createSkillRepository } from '../repositories/skill-repository';
import { scanSkillRoot } from '../skill-scanner';
import {
  updateAvailabilityInCodexYaml,
  updateAvailabilityInSkillMarkdown,
  updateCodexMetadataYaml,
  updateMetadataInSkillMarkdown
} from './skill-mutations';

type UndoState = ActivityLog['undoState'];

interface SkillCurrentState {
  availabilityMode: AvailabilityMode;
  metadata: UpdateSkillMetadataInput;
}

interface LinkStateSnapshot {
  exists: boolean;
  isSymlink: boolean;
  symlinkTarget: string | null;
}

type UndoKind =
  | 'skill.availability'
  | 'skill.metadata'
  | 'skill.link'
  | 'directory.link';

interface UndoPayload {
  supported: true;
  kind: UndoKind;
  targetPath: string;
  toolType?: ToolType;
  rootPath?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

function syncDefaultDirectories(directoryRepository: ReturnType<typeof createDirectoryRepository>) {
  directoryRepository.upsertDefaults(getDefaultDirectories(getProjectRoot(), getHomeDir()));
}

async function maybeRead(filePath: string) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function buildMetadataSnapshotFromSkill(skill: NormalizedSkill): UpdateSkillMetadataInput {
  const snapshot: UpdateSkillMetadataInput = {
    name: skill.name,
    description: skill.description
  };

  if (skill.toolType === 'claude') {
    snapshot.claude = {
      userInvocable: skill.frontmatter['user-invocable'] !== false,
      disableModelInvocation: skill.frontmatter['disable-model-invocation'] === true,
      allowedTools: Array.isArray(skill.frontmatter['allowed-tools'])
        ? skill.frontmatter['allowed-tools'].map((item) => String(item))
        : [],
      context: String(skill.frontmatter.context ?? ''),
      agent: String(skill.frontmatter.agent ?? ''),
      paths: Array.isArray(skill.frontmatter.paths)
        ? skill.frontmatter.paths.map((item) => String(item))
        : []
    };
  }

  if (skill.toolType === 'codex') {
    const policy = (skill.codexConfig?.policy ?? {}) as Record<string, unknown>;
    snapshot.codex = {
      allowImplicitInvocation: policy.allow_implicit_invocation !== false,
      interface: String(skill.codexConfig?.interface ?? ''),
      dependencies: Array.isArray(skill.codexConfig?.dependencies)
        ? skill.codexConfig.dependencies.map((item) => String(item))
        : []
    };
  }

  return snapshot;
}

async function readCurrentSkillState(
  skillPath: string,
  rootPath: string,
  toolType: ToolType
): Promise<SkillCurrentState | null> {
  const rawMarkdown = await maybeRead(join(skillPath, 'SKILL.md'));
  if (!rawMarkdown) {
    return null;
  }

  const parsedMarkdown = parseSkillMarkdown(rawMarkdown);
  const codexConfig = parseCodexConfig(await maybeRead(join(skillPath, 'agents', 'openai.yaml')));
  const metadata: UpdateSkillMetadataInput = {
    name: String(parsedMarkdown.frontmatter.name ?? basename(skillPath)),
    description: String(parsedMarkdown.frontmatter.description ?? '')
  };

  if (toolType === 'claude') {
    metadata.claude = {
      userInvocable: parsedMarkdown.frontmatter['user-invocable'] !== false,
      disableModelInvocation: parsedMarkdown.frontmatter['disable-model-invocation'] === true,
      allowedTools: Array.isArray(parsedMarkdown.frontmatter['allowed-tools'])
        ? parsedMarkdown.frontmatter['allowed-tools'].map((item) => String(item))
        : [],
      context: String(parsedMarkdown.frontmatter.context ?? ''),
      agent: String(parsedMarkdown.frontmatter.agent ?? ''),
      paths: Array.isArray(parsedMarkdown.frontmatter.paths)
        ? parsedMarkdown.frontmatter.paths.map((item) => String(item))
        : []
    };
  }

  if (toolType === 'codex') {
    const policy = (codexConfig?.policy ?? {}) as Record<string, unknown>;
    metadata.codex = {
      allowImplicitInvocation: policy.allow_implicit_invocation !== false,
      interface: String(codexConfig?.interface ?? ''),
      dependencies: Array.isArray(codexConfig?.dependencies)
        ? codexConfig.dependencies.map((item) => String(item))
        : []
    };
  }

  return {
    availabilityMode: resolveAvailabilityMode(toolType, parsedMarkdown.frontmatter, codexConfig),
    metadata
  };
}

async function writeAvailability(skill: NormalizedSkill, mode: AvailabilityMode) {
  const markdownPath = join(skill.skillPath, 'SKILL.md');
  const rawMarkdown = await readFile(markdownPath, 'utf8');
  await writeFile(
    markdownPath,
    updateAvailabilityInSkillMarkdown(rawMarkdown, skill.toolType, mode),
    'utf8'
  );

  if (skill.toolType === 'codex') {
    const codexPath = join(skill.skillPath, 'agents', 'openai.yaml');
    await ensureDirectory(join(skill.skillPath, 'agents'));
    let rawCodexYaml: string | null = null;
    try {
      rawCodexYaml = await readFile(codexPath, 'utf8');
    } catch {
      rawCodexYaml = null;
    }
    await writeFile(codexPath, updateAvailabilityInCodexYaml(rawCodexYaml, mode), 'utf8');
  }
}

async function writeMetadata(skill: NormalizedSkill, input: UpdateSkillMetadataInput) {
  const markdownPath = join(skill.skillPath, 'SKILL.md');
  const rawMarkdown = await readFile(markdownPath, 'utf8');
  await writeFile(markdownPath, updateMetadataInSkillMarkdown(rawMarkdown, input), 'utf8');

  if (skill.toolType === 'codex' && input.codex) {
    const codexPath = join(skill.skillPath, 'agents', 'openai.yaml');
    await ensureDirectory(join(skill.skillPath, 'agents'));
    let rawCodexYaml: string | null = null;
    try {
      rawCodexYaml = await readFile(codexPath, 'utf8');
    } catch {
      rawCodexYaml = null;
    }
    await writeFile(codexPath, updateCodexMetadataYaml(rawCodexYaml, input.codex), 'utf8');
  }
}

function toUndoPayload(detail: Record<string, unknown>): UndoPayload | null {
  const undo = detail.undo;
  if (!undo || typeof undo !== 'object') {
    return null;
  }

  const undoRecord = undo as Record<string, unknown>;
  if (undoRecord.supported !== true || typeof undoRecord.kind !== 'string') {
    return null;
  }

  return undoRecord as unknown as UndoPayload;
}

function buildUnsupportedUndoState(): UndoState {
  return {
    supported: false,
    available: false,
    reason: null
  };
}

function buildLinkSnapshot(state: LinkStateSnapshot) {
  return {
    exists: state.exists,
    isSymlink: state.isSymlink,
    symlinkTarget: state.symlinkTarget
  };
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildSkillService() {
  const db = createAppDatabase();
  const directoryRepository = createDirectoryRepository(db);
  const skillRepository = createSkillRepository(db);
  const logRepository = createLogRepository(db);

  syncDefaultDirectories(directoryRepository);

  async function evaluateUndoState(log: Omit<ActivityLog, 'undoState'>): Promise<UndoState> {
    const undo = toUndoPayload(log.detail);
    if (!undo) {
      return buildUnsupportedUndoState();
    }

    if (undo.kind === 'skill.availability' || undo.kind === 'skill.metadata') {
      if (!undo.toolType || !undo.rootPath) {
        return {
          supported: true,
          available: false,
          reason: '日志缺少回滚所需的技能上下文'
        };
      }

      const currentState = await readCurrentSkillState(undo.targetPath, undo.rootPath, undo.toolType);
      if (!currentState) {
        return {
          supported: true,
          available: false,
          reason: '目标技能已不存在'
        };
      }

      if (undo.kind === 'skill.availability') {
        if (currentState.availabilityMode !== undo.after.availabilityMode) {
          return {
            supported: true,
            available: false,
            reason: '目标已被后续操作修改'
          };
        }
      }

      if (undo.kind === 'skill.metadata') {
        if (JSON.stringify(currentState.metadata) !== JSON.stringify(undo.after.metadata)) {
          return {
            supported: true,
            available: false,
            reason: '目标已被后续操作修改'
          };
        }
      }

      return {
        supported: true,
        available: true,
        reason: null
      };
    }

    if (undo.kind === 'skill.link' || undo.kind === 'directory.link') {
      const currentState = await readPathState(undo.targetPath);
      if (!currentState.exists) {
        return {
          supported: true,
          available: false,
          reason: '目标链接已不存在'
        };
      }

      if (!currentState.isSymlink) {
        return {
          supported: true,
          available: false,
          reason: '目标已不再是软链接'
        };
      }

      if (currentState.symlinkTarget !== undo.after.symlinkTarget) {
        return {
          supported: true,
          available: false,
          reason: '目标已不再指向原始来源'
        };
      }

      return {
        supported: true,
        available: true,
        reason: null
      };
    }

    return buildUnsupportedUndoState();
  }

  async function enrichLog(log: ActivityLog): Promise<ActivityLog> {
    const { undoState: _unusedUndoState, ...rest } = log as ActivityLog;
    return {
      ...rest,
      undoState: await evaluateUndoState(rest)
    };
  }

  return {
    async rescan() {
      syncDefaultDirectories(directoryRepository);
      const directories = directoryRepository.listAll();
      const scanned = await Promise.all(
        directories.map((directory) =>
          scanSkillRoot(directory.path, {
            id: directory.id,
            toolType: directory.toolType,
            scope: directory.scope,
            isDefault: directory.isDefault
          })
        )
      );
      const skills = scanned.flat();
      skillRepository.replaceIndex(skills);
      logRepository.log('skills.rescanned', 'system', getProjectRoot(), {
        count: skills.length
      });
      return { skills };
    },

    listSkills() {
      return skillRepository.listAll();
    },

    async getSkill(id: string) {
      const existing = skillRepository.findById(id);
      if (existing) {
        return existing;
      }

      const rescanned = await this.rescan();
      return rescanned.skills.find((skill) => skill.id === id) ?? null;
    },

    async updateAvailability(id: string, mode: AvailabilityMode) {
      const skill = await this.getSkill(id);
      if (!skill) {
        throw new Error('Skill not found');
      }

      const before = { availabilityMode: skill.availabilityMode };
      await writeAvailability(skill, mode);
      const currentState = await readCurrentSkillState(skill.skillPath, skill.rootPath, skill.toolType);
      logRepository.log('skill.availability.updated', 'skill', skill.skillPath, {
        mode,
        undo: {
          supported: true,
          kind: 'skill.availability',
          targetPath: skill.skillPath,
          toolType: skill.toolType,
          rootPath: skill.rootPath,
          before,
          after: {
            availabilityMode: currentState?.availabilityMode ?? mode
          }
        }
      });
      return this.rescan();
    },

    async updateAvailabilityBatch(skillIds: string[], mode: AvailabilityMode) {
      const uniqueSkillIds = [...new Set(skillIds)];
      for (const skillId of uniqueSkillIds) {
        const skill = await this.getSkill(skillId);
        if (!skill) {
          throw new Error(`Skill not found: ${skillId}`);
        }

        const before = { availabilityMode: skill.availabilityMode };
        await writeAvailability(skill, mode);
        const currentState = await readCurrentSkillState(skill.skillPath, skill.rootPath, skill.toolType);
        logRepository.log('skill.availability.updated', 'skill', skill.skillPath, {
          mode,
          batch: true,
          undo: {
            supported: true,
            kind: 'skill.availability',
            targetPath: skill.skillPath,
            toolType: skill.toolType,
            rootPath: skill.rootPath,
            before,
            after: {
              availabilityMode: currentState?.availabilityMode ?? mode
            }
          }
        });
      }

      return this.rescan();
    },

    async updateMetadata(id: string, input: UpdateSkillMetadataInput) {
      const skill = await this.getSkill(id);
      if (!skill) {
        throw new Error('Skill not found');
      }

      const before = buildMetadataSnapshotFromSkill(skill);
      await writeMetadata(skill, input);
      const currentState = await readCurrentSkillState(skill.skillPath, skill.rootPath, skill.toolType);

      logRepository.log('skill.metadata.updated', 'skill', skill.skillPath, {
        undo: {
          supported: true,
          kind: 'skill.metadata',
          targetPath: skill.skillPath,
          toolType: skill.toolType,
          rootPath: skill.rootPath,
          before: {
            metadata: before
          },
          after: {
            metadata: currentState?.metadata ?? input
          }
        }
      });
      return this.rescan();
    },

    async deleteSkill(id: string) {
      const skill = await this.getSkill(id);
      if (!skill) {
        throw new Error('Skill not found');
      }

      await removeDirectoryOrLink(skill.skillPath);
      logRepository.log('skill.deleted', 'skill', skill.skillPath, {
        isSymlink: skill.isSymlink
      });
      return this.rescan();
    },

    async createSkillLink(input: CreateSkillLinkInput) {
      const skill = await this.getSkill(input.skillId);
      if (!skill) {
        throw new Error('Skill not found');
      }

      const targetPath = join(input.targetRootPath, basename(skill.skillPath));
      const before = buildLinkSnapshot(await readPathState(targetPath));
      await createDirectorySymlink(skill.skillPath, targetPath);
      const after = buildLinkSnapshot(await readPathState(targetPath));
      logRepository.log('skill.linked', 'skill', targetPath, {
        source: skill.skillPath,
        undo: {
          supported: true,
          kind: 'skill.link',
          targetPath,
          before,
          after
        }
      });
      return this.rescan();
    },

    async createRootLink(input: CreateRootLinkInput) {
      const before = buildLinkSnapshot(await readPathState(input.targetRootPath));
      await createDirectorySymlink(input.sourceRootPath, input.targetRootPath);
      const after = buildLinkSnapshot(await readPathState(input.targetRootPath));
      logRepository.log('directory.linked', 'directory', input.targetRootPath, {
        source: input.sourceRootPath,
        undo: {
          supported: true,
          kind: 'directory.link',
          targetPath: input.targetRootPath,
          before,
          after
        }
      });
      return this.rescan();
    },

    async listLogs() {
      const logs = logRepository.listAll();
      return Promise.all(logs.map((log) => enrichLog(log)));
    },

    async getLog(id: string) {
      const log = logRepository.findById(id);
      if (!log) {
        return { log: null };
      }

      return { log: await enrichLog(log) };
    },

    async undoLog(id: string) {
      const found = await this.getLog(id);
      if (!found.log) {
        throw new Error('操作记录不存在');
      }

      if (!found.log.undoState.supported) {
        throw new Error('该操作不支持撤销');
      }

      if (!found.log.undoState.available) {
        throw new Error(found.log.undoState.reason ?? '该操作当前不可撤销');
      }

      const undo = toUndoPayload(found.log.detail);
      if (!undo) {
        throw new Error('该操作不支持撤销');
      }

      if (undo.kind === 'skill.availability') {
        const skills = skillRepository.listAll();
        const targetSkill = skills.find((skill) => skill.skillPath === undo.targetPath);
        if (!targetSkill) {
          throw new Error('目标技能不存在');
        }
        await writeAvailability(targetSkill, undo.before.availabilityMode as AvailabilityMode);
      }

      if (undo.kind === 'skill.metadata') {
        const skills = skillRepository.listAll();
        const targetSkill = skills.find((skill) => skill.skillPath === undo.targetPath);
        if (!targetSkill) {
          throw new Error('目标技能不存在');
        }
        await writeMetadata(
          targetSkill,
          undo.before.metadata as unknown as UpdateSkillMetadataInput
        );
      }

      if (undo.kind === 'skill.link' || undo.kind === 'directory.link') {
        await removeDirectoryOrLink(undo.targetPath);
      }

      logRepository.log('operation.undone', found.log.targetType, found.log.targetPath, {
        sourceLogId: found.log.id,
        sourceAction: found.log.action
      });

      await this.rescan();
      return { ok: true };
    },

    async exportLogsCsv() {
      const logs = await Promise.all(logRepository.listForExport().map((log) => enrichLog(log)));
      const header = [
        'createdAt',
        'action',
        'targetType',
        'targetPath',
        'undoSupported',
        'undoAvailable',
        'undoReason',
        'detailJson'
      ];
      const rows = logs.map((log) =>
        [
          log.createdAt,
          log.action,
          log.targetType,
          log.targetPath,
          String(log.undoState.supported),
          String(log.undoState.available),
          log.undoState.reason ?? '',
          JSON.stringify(log.detail)
        ]
          .map((value) => escapeCsv(value))
          .join(',')
      );

      return `\uFEFF${header.join(',')}\r\n${rows.join('\r\n')}`;
    },

    async clearLogs() {
      logRepository.clearAll();
      return { ok: true };
    }
  };
}
