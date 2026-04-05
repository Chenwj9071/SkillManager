import { describe, expect, it } from 'vitest';
import {
  updateAvailabilityInCodexYaml,
  updateAvailabilityInSkillMarkdown,
  updateCodexMetadataYaml,
  updateMetadataInSkillMarkdown
} from './skill-mutations';

describe('skill mutations', () => {
  it('writes claude manual-only mode back to frontmatter', () => {
    const raw = `---\nname: demo\ndescription: demo\n---\n\nBody`;
    const updated = updateAvailabilityInSkillMarkdown(raw, 'claude', 'manual_only');

    expect(updated).toContain('disable-model-invocation: true');
  });

  it('writes structured claude metadata back to frontmatter', () => {
    const raw = [
      '---',
      'name: demo',
      'description: demo',
      'user-invocable: true',
      'allowed-tools:',
      '  - Read',
      '---',
      '',
      'Body'
    ].join('\n');

    const updated = updateMetadataInSkillMarkdown(raw, {
      name: 'reviewer',
      description: 'review code',
      claude: {
        userInvocable: false,
        disableModelInvocation: true,
        allowedTools: ['Read', 'Edit'],
        context: 'Focus on regressions',
        agent: 'review-helper',
        paths: ['src/**', 'tests/**']
      }
    });

    expect(updated).toContain('user-invocable: false');
    expect(updated).toContain('disable-model-invocation: true');
    expect(updated).toContain('- Read');
    expect(updated).toContain('- Edit');
    expect(updated).toContain('context: Focus on regressions');
    expect(updated).toContain('agent: review-helper');
    expect(updated).toContain('- src/**');
    expect(updated).toContain('- tests/**');
  });

  it('writes structured codex metadata to yaml', () => {
    const updated = updateCodexMetadataYaml(
      'policy:\n  allow_implicit_invocation: true\n',
      {
        allowImplicitInvocation: false,
        interface: 'cli',
        dependencies: ['node', 'git']
      }
    );

    expect(updated).toContain('allow_implicit_invocation: false');
    expect(updated).toContain('interface: cli');
    expect(updated).toContain('- node');
    expect(updated).toContain('- git');
  });

  it('writes codex manual-only mode to yaml policy', () => {
    const updated = updateAvailabilityInCodexYaml(null, 'manual_only');

    expect(updated).toContain('allow_implicit_invocation: false');
  });
});
