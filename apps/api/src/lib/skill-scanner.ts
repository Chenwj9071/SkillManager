import { lstat, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { DirectoryRecord, NormalizedSkill } from '@skill-manager/shared';
import { resolveAvailabilityMode } from './availability';
import { makeId } from './paths';
import { parseCodexConfig, parseSkillMarkdown } from './skill-parser';

async function maybeRead(filePath: string) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function scanSkillRoot(
  rootPath: string,
  directory: Pick<DirectoryRecord, 'toolType' | 'scope' | 'isDefault'> & {
    id?: string;
    rootPath?: string;
  }
): Promise<NormalizedSkill[]> {
  let entries: string[];

  try {
    entries = await readdir(rootPath);
  } catch {
    return [];
  }

  const skills: NormalizedSkill[] = [];

  for (const entry of entries) {
    const skillPath = join(rootPath, entry);
    const skillMarkdownPath = join(skillPath, 'SKILL.md');
    const skillMarkdown = await maybeRead(skillMarkdownPath);

    if (!skillMarkdown) {
      continue;
    }

    const details = parseSkillMarkdown(skillMarkdown);
    const codexConfig = parseCodexConfig(await maybeRead(join(skillPath, 'agents', 'openai.yaml')));
    const skillLstat = await lstat(skillPath);
    const actualStat = await stat(skillPath);

    skills.push({
      id: makeId('skill'),
      directoryId: directory.id ?? makeId('dir'),
      toolType: directory.toolType,
      rootPath,
      skillPath,
      slug: basename(skillPath),
      name: String(details.frontmatter.name ?? entry),
      description: String(details.frontmatter.description ?? ''),
      summary: details.summary,
      availabilityMode: resolveAvailabilityMode(directory.toolType, details.frontmatter, codexConfig),
      exists: true,
      isSymlink: skillLstat.isSymbolicLink(),
      symlinkTarget: skillLstat.isSymbolicLink() ? await realpath(skillPath) : null,
      broken: false,
      warnings: [],
      frontmatter: details.frontmatter,
      codexConfig,
      lastModifiedAt: new Date(actualStat.mtimeMs).toISOString()
    });
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}
