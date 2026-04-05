import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';

export function parseSkillMarkdown(raw: string) {
  const parsed = matter(raw);

  return {
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content,
    summary: parsed.content.trim().replace(/\s+/g, ' ').slice(0, 240)
  };
}

export function parseCodexConfig(raw?: string | null) {
  if (!raw) {
    return null;
  }

  return (parseYaml(raw) as Record<string, unknown>) ?? null;
}
