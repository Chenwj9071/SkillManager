import type { AvailabilityMode, ToolType } from '@skill-manager/shared';

type Dict = Record<string, unknown> | undefined | null;

export function resolveAvailabilityMode(
  toolType: ToolType,
  frontmatter: Dict,
  codexConfig?: Dict
): AvailabilityMode {
  if (!frontmatter?.name || !frontmatter?.description) {
    return 'disabled';
  }

  if (toolType === 'claude') {
    if (frontmatter['disable-model-invocation'] === true) {
      return 'manual_only';
    }

    if (frontmatter['user-invocable'] === false) {
      return 'hidden';
    }

    return 'automatic';
  }

  if (toolType === 'codex') {
    const policy = (codexConfig?.policy ?? {}) as Record<string, unknown>;
    if (policy.allow_implicit_invocation === false) {
      return 'manual_only';
    }

    return 'automatic';
  }

  return 'unknown';
}
