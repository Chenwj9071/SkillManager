import { describe, expect, it } from 'vitest';
import { parseSkillMarkdown } from './skill-parser';
import { resolveAvailabilityMode } from './availability';

describe('skill parser', () => {
  it('parses frontmatter and body summary', () => {
    const result = parseSkillMarkdown(`---\nname: demo\ndescription: test skill\ndisable-model-invocation: true\n---\n\nBody`);

    expect(result.frontmatter.name).toBe('demo');
    expect(result.summary).toContain('Body');
  });

  it('maps claude manual-only mode correctly', () => {
    expect(
      resolveAvailabilityMode(
        'claude',
        {
          name: 'demo',
          description: 'demo',
          'disable-model-invocation': true
        },
        undefined
      )
    ).toBe('manual_only');
  });
});
