import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { AvailabilityMode, CreateRootLinkInput, CreateSkillLinkInput, NormalizedSkill, UpdateSkillMetadataInput } from '@skill-manager/shared';
import { createAppDatabase } from '../db';
import { createDirectorySymlink, ensureDirectory, removeDirectoryOrLink } from '../filesystem';
import { getDefaultDirectories } from '../default-directories';
import { getHomeDir, getProjectRoot } from '../paths';
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

function syncDefaultDirectories(directoryRepository: ReturnType<typeof createDirectoryRepository>) {
  directoryRepository.upsertDefaults(getDefaultDirectories(getProjectRoot(), getHomeDir()));
}

export function buildSkillService() {
  const db = createAppDatabase();
  const directoryRepository = createDirectoryRepository(db);
  const skillRepository = createSkillRepository(db);
  const logRepository = createLogRepository(db);

  syncDefaultDirectories(directoryRepository);

  async function writeAvailability(skill: NormalizedSkill, mode: AvailabilityMode) {
    const markdownPath = join(skill.skillPath, 'SKILL.md');
    const rawMarkdown = await readFile(markdownPath, 'utf8');
    await writeFile(markdownPath, updateAvailabilityInSkillMarkdown(rawMarkdown, skill.toolType, mode), 'utf8');

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

      await writeAvailability(skill, mode);
      logRepository.log('skill.availability.updated', 'skill', skill.skillPath, { mode });
      return this.rescan();
    },

    async updateAvailabilityBatch(skillIds: string[], mode: AvailabilityMode) {
      const uniqueSkillIds = [...new Set(skillIds)];
      for (const skillId of uniqueSkillIds) {
        const skill = await this.getSkill(skillId);
        if (!skill) {
          throw new Error(`Skill not found: ${skillId}`);
        }

        await writeAvailability(skill, mode);
        logRepository.log('skill.availability.updated', 'skill', skill.skillPath, {
          mode,
          batch: true
        });
      }

      return this.rescan();
    },

    async updateMetadata(id: string, input: UpdateSkillMetadataInput) {
      const skill = await this.getSkill(id);
      if (!skill) {
        throw new Error('Skill not found');
      }

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

      logRepository.log('skill.metadata.updated', 'skill', skill.skillPath, input);
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
      await createDirectorySymlink(skill.skillPath, targetPath);
      logRepository.log('skill.linked', 'skill', targetPath, {
        source: skill.skillPath
      });
      return this.rescan();
    },

    async createRootLink(input: CreateRootLinkInput) {
      await createDirectorySymlink(input.sourceRootPath, input.targetRootPath);
      logRepository.log('directory.linked', 'directory', input.targetRootPath, {
        source: input.sourceRootPath
      });
      return this.rescan();
    },

    listLogs() {
      return logRepository.listAll();
    },

    async clearLogs() {
      logRepository.clearAll();
      return { ok: true };
    }
  };
}
