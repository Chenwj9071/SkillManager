import matter from 'gray-matter';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type {
  AvailabilityMode,
  CodexMetadataInput,
  ToolType,
  UpdateSkillMetadataInput
} from '@skill-manager/shared';

function normalizeStringArray(values: string[]) {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

export function updateAvailabilityInSkillMarkdown(
  raw: string,
  toolType: ToolType,
  mode: AvailabilityMode
) {
  const parsed = matter(raw);
  const nextData = { ...parsed.data };

  if (toolType === 'claude') {
    nextData['disable-model-invocation'] = mode === 'manual_only';
    nextData['user-invocable'] = mode !== 'hidden';
  }

  return matter.stringify(parsed.content, nextData);
}

export function updateMetadataInSkillMarkdown(raw: string, input: UpdateSkillMetadataInput) {
  const parsed = matter(raw);
  const nextData = {
    ...parsed.data,
    name: input.name,
    description: input.description
  } as Record<string, unknown>;

  if (input.claude) {
    nextData['user-invocable'] = input.claude.userInvocable;
    nextData['disable-model-invocation'] = input.claude.disableModelInvocation;
    nextData['allowed-tools'] = normalizeStringArray(input.claude.allowedTools);
    nextData.context = input.claude.context.trim();
    nextData.agent = input.claude.agent.trim();
    nextData.paths = normalizeStringArray(input.claude.paths);
  }

  return matter.stringify(parsed.content, nextData);
}

export function updateAvailabilityInCodexYaml(raw: string | null, mode: AvailabilityMode) {
  const parsed = raw ? ((parseYaml(raw) as Record<string, unknown>) ?? {}) : {};
  const policy = ((parsed.policy as Record<string, unknown> | undefined) ?? {});
  policy.allow_implicit_invocation = mode !== 'manual_only';
  parsed.policy = policy;
  return stringifyYaml(parsed);
}

export function updateCodexMetadataYaml(raw: string | null, input: CodexMetadataInput) {
  const parsed = raw ? ((parseYaml(raw) as Record<string, unknown>) ?? {}) : {};
  const policy = ((parsed.policy as Record<string, unknown> | undefined) ?? {});

  policy.allow_implicit_invocation = input.allowImplicitInvocation;
  parsed.policy = policy;
  parsed.interface = input.interface.trim();
  parsed.dependencies = normalizeStringArray(input.dependencies);

  return stringifyYaml(parsed);
}
