import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

const activeQueryClients: QueryClient[] = [];

function buildJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response;
}

function buildTextResponse(body: string, contentType = 'text/plain; charset=utf-8') {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('Not json');
    },
    text: async () => body,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null)
    }
  } as unknown as Response;
}

function mockApiFetch(options: { legacyLogs?: boolean; unavailableUndo?: boolean } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/api/directories') && method === 'GET') {
      return buildJsonResponse({
        directories: [
          {
            id: 'dir-claude',
            toolType: 'claude',
            path: '/repo/.claude/skills',
            scope: 'project',
            isDefault: true,
            exists: true,
            isSymlink: false,
            symlinkTarget: null
          },
          {
            id: 'dir-claude-user',
            toolType: 'claude',
            path: '/user/.claude/skills',
            scope: 'user',
            isDefault: true,
            exists: true,
            isSymlink: false,
            symlinkTarget: null
          },
          {
            id: 'dir-cursor',
            toolType: 'cursor',
            path: '/repo/.cursor/rules',
            scope: 'project',
            isDefault: true,
            exists: true,
            isSymlink: false,
            symlinkTarget: null
          },
          {
            id: 'dir-generic',
            toolType: 'generic',
            path: '/custom/skills',
            scope: 'custom',
            isDefault: false,
            exists: true,
            isSymlink: false,
            symlinkTarget: null
          }
        ]
      });
    }

    if (url.endsWith('/api/skills') && method === 'GET') {
      return buildJsonResponse({
        skills: [
          {
            id: 'skill-1',
            directoryId: 'dir-claude',
            toolType: 'claude',
            rootPath: '/repo/.claude/skills',
            skillPath: '/repo/.claude/skills/reviewer',
            slug: 'reviewer',
            name: 'Reviewer',
            description: 'Review code changes',
            summary: 'Review code changes',
            availabilityMode: 'automatic',
            exists: true,
            isSymlink: false,
            symlinkTarget: null,
            broken: false,
            warnings: [],
            frontmatter: {
              name: 'Reviewer',
              description: 'Review code changes',
              'disable-model-invocation': false,
              'user-invocable': true,
              'allowed-tools': ['Read'],
              context: 'Review with focus',
              agent: 'reviewer-helper',
              paths: ['src/**']
            },
            codexConfig: null,
            lastModifiedAt: '2026-04-05T00:00:00.000Z'
          },
          {
            id: 'skill-2',
            directoryId: 'dir-cursor',
            toolType: 'cursor',
            rootPath: '/repo/.cursor/rules',
            skillPath: '/repo/.cursor/rules/planner',
            slug: 'planner',
            name: 'Planner',
            description: 'Plan work items',
            summary: 'Plan work items',
            availabilityMode: 'manual_only',
            exists: true,
            isSymlink: false,
            symlinkTarget: null,
            broken: false,
            warnings: [],
            frontmatter: {
              name: 'Planner',
              description: 'Plan work items'
            },
            codexConfig: null,
            lastModifiedAt: '2026-04-05T00:00:00.000Z'
          }
        ]
      });
    }

    if (url.endsWith('/api/logs') && method === 'GET') {
      return buildJsonResponse({
        logs: [
          {
            id: 'log-1',
            action: 'skill.metadata.updated',
            targetType: 'skill',
            targetPath: '/repo/.claude/skills/reviewer',
            detail: {},
            createdAt: '2026-04-05T08:00:00.000Z',
            ...(options.legacyLogs
              ? {}
              : {
                  undoState: {
                    supported: true,
                    available: options.unavailableUndo ? false : true,
                    reason: options.unavailableUndo ? '目标已被后续修改' : null
                  }
                })
          }
        ]
      });
    }

    if (url.endsWith('/api/logs/log-1') && method === 'GET') {
      return buildJsonResponse({
        log: {
          id: 'log-1',
          action: 'skill.metadata.updated',
          targetType: 'skill',
          targetPath: '/repo/.claude/skills/reviewer',
          detail: {
            undo: {
              supported: true,
              kind: 'skill.metadata',
              targetPath: '/repo/.claude/skills/reviewer'
            }
          },
          createdAt: '2026-04-05T08:00:00.000Z',
          ...(options.legacyLogs
            ? {}
            : {
                undoState: {
                  supported: true,
                  available: options.unavailableUndo ? false : true,
                  reason: options.unavailableUndo ? '目标已被后续修改' : null
                }
              })
        }
      });
    }

    if (url.endsWith('/api/logs/log-1/undo') && method === 'POST') {
      return buildJsonResponse({ ok: true });
    }

    if (url.endsWith('/api/logs/export') && method === 'GET') {
      return buildTextResponse('createdAt,action\r\n2026-04-05T08:00:00.000Z,skill.metadata.updated', 'text/csv; charset=utf-8');
    }

    if (url.endsWith('/api/logs') && method === 'DELETE') {
      return buildJsonResponse({ ok: true });
    }

    if (url.endsWith('/api/directories') && method === 'POST') {
      return buildJsonResponse({
        directory: {
          id: 'dir-added',
          toolType: 'generic',
          path: '/picked/parent',
          scope: 'custom',
          isDefault: false,
          exists: true,
          isSymlink: false,
          symlinkTarget: null
        }
      });
    }

    if (url.endsWith('/api/scan') && method === 'POST') {
      return buildJsonResponse({ skills: [] });
    }

    if (url.endsWith('/api/skills/batch-availability') && method === 'PATCH') {
      return buildJsonResponse({ skills: [] });
    }

    if (url.endsWith('/api/skills/skill-1/availability') && method === 'PATCH') {
      return buildJsonResponse({ skills: [] });
    }

    if (url.endsWith('/api/skills/skill-1/metadata') && method === 'PATCH') {
      return buildJsonResponse({ skills: [] });
    }

    if (url.endsWith('/api/dialogs/select-directory') && method === 'POST') {
      return buildJsonResponse({ path: '/picked/parent' });
    }

    if (url.endsWith('/api/links/root') && method === 'POST') {
      return buildJsonResponse({ skills: [] });
    }

    if (url.endsWith('/api/open') && method === 'POST') {
      return buildJsonResponse({ ok: true });
    }

    if (url.endsWith('/api/links/skill/batch') && method === 'POST') {
      return buildJsonResponse({
        skills: [],
        results: {
          created: [
            {
              skillId: 'skill-1',
              targetPath: '/picked/parent/skills/reviewer',
              sourcePath: '/repo/.claude/skills/reviewer',
              status: 'created'
            }
          ],
          skipped: [],
          failed: [],
          summary: {
            requested: 2,
            created: 1,
            skipped: 0,
            failed: 0
          }
        }
      });
    }

    return buildJsonResponse({});
  });

  globalThis.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      },
      mutations: {
        gcTime: 0
      }
    }
  });
  activeQueryClients.push(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

async function clickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
  triggerId: string,
  optionText: string
) {
  const trigger = container.querySelector(`#${triggerId}`) as HTMLElement | null;
  expect(trigger).not.toBeNull();
  await user.click(trigger!);
  await user.click(await screen.findByRole('option', { name: optionText }));
}

afterEach(() => {
  for (const client of activeQueryClients.splice(0)) {
    client.clear();
  }
});

describe('App', () => {
  it('renders the updated left panel copy, groups directories by type, and lets custom directory picker fill the path', async () => {
    mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    expect(await screen.findByText('本地Skills可视化管理平台')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('#directory-group-claude')).not.toBeNull();
      expect(container.querySelector('#directory-group-generic')).not.toBeNull();
    });

    const claudeGroup = container.querySelector('#directory-group-claude');
    const genericGroup = container.querySelector('#directory-group-generic');
    expect(claudeGroup?.textContent).toContain('Claude');
    expect(claudeGroup?.textContent).toContain('/repo/.claude/skills');
    expect(claudeGroup?.textContent).toContain('/user/.claude/skills');
    expect(genericGroup?.textContent).toContain('其他');

    const chooseDirectoryButton = container.querySelector(
      '#pick-directory-path-button'
    ) as HTMLButtonElement | null;
    expect(chooseDirectoryButton).not.toBeNull();
    await user.click(chooseDirectoryButton!);

    const directoryInput = container.querySelector('#directory-path') as HTMLInputElement | null;
    expect(directoryInput).not.toBeNull();

    await waitFor(() => {
      expect(directoryInput!.value).toBe('/picked/parent');
    });
  });

  it('shows a success toast after adding a custom directory', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    const directoryInput = container.querySelector('#directory-path') as HTMLInputElement | null;
    expect(directoryInput).not.toBeNull();
    await user.type(directoryInput!, '/custom/new-skills');

    const addButton = container.querySelector('#add-directory-button') as HTMLButtonElement | null;
    expect(addButton).not.toBeNull();
    await user.click(addButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/directories',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            path: '/custom/new-skills',
            toolType: 'generic',
            scope: 'custom'
          })
        })
      );
    });

    expect(await screen.findByText('目录已添加')).toBeInTheDocument();
  });

  it('preserves selected skills across path changes and applies batch availability to all selected ids', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    await waitFor(() => {
      expect(container.querySelectorAll('.skill-row .checkbox-row input[type="checkbox"]')).toHaveLength(2);
    });

    const checkboxes = container.querySelectorAll('.skill-row .checkbox-row input[type="checkbox"]');
    await user.click(checkboxes[0] as HTMLInputElement);

    await clickSelectOption(user, container, 'path-filter', '/repo/.cursor/rules');

    await waitFor(() => {
      const visibleSkillNames = Array.from(
        container.querySelectorAll('.skill-row .skill-detail-button strong')
      ).map((node) => node.textContent);
      expect(visibleSkillNames).toEqual(['Planner']);
    });

    const selectCurrentPathButton = container.querySelector(
      '#select-current-path-skills-button'
    ) as HTMLButtonElement | null;
    expect(selectCurrentPathButton).not.toBeNull();
    await user.click(selectCurrentPathButton!);

    await clickSelectOption(user, container, 'batch-availability-mode', '已禁用');

    const batchApplyButton = container.querySelector(
      '#batch-update-availability-button'
    ) as HTMLButtonElement | null;
    expect(batchApplyButton).not.toBeNull();
    await user.click(batchApplyButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/skills/batch-availability',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            skillIds: ['skill-1', 'skill-2'],
            mode: 'disabled'
          })
        })
      );
    });
  });

  it('shows only the skill path in the list and keeps the selected skill highlighted', async () => {
    mockApiFetch();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    await waitFor(() => {
      expect(container.querySelectorAll('.skill-row')).toHaveLength(2);
    });

    const firstSkillRow = container.querySelector('.skill-row') as HTMLElement | null;
    expect(firstSkillRow).not.toBeNull();
    expect(firstSkillRow).toHaveClass('active');

    const pathRows = firstSkillRow?.querySelectorAll('.skill-detail-button .path-scroll.subtle');
    expect(pathRows).toHaveLength(1);
    expect(pathRows?.[0]?.textContent).toBe('/repo/.claude/skills/reviewer');
  });

  it('submits structured claude metadata and availability updates', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    await waitFor(() => {
      expect(container.querySelector('#claude-user-invocable')).not.toBeNull();
      expect(container.querySelector('#claude-allowed-tools')).not.toBeNull();
    });

    const userInvocableToggle = container.querySelector(
      '#claude-user-invocable'
    ) as HTMLInputElement | null;
    const allowedToolsInput = container.querySelector(
      '#claude-allowed-tools'
    ) as HTMLTextAreaElement | null;

    await user.click(userInvocableToggle!);
    await user.clear(allowedToolsInput!);
    await user.type(allowedToolsInput!, 'Read{enter}Edit');

    const saveMetadataButton = container.querySelector(
      '#save-metadata-button'
    ) as HTMLButtonElement | null;
    expect(saveMetadataButton).not.toBeNull();
    await user.click(saveMetadataButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/skills/skill-1/metadata',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Reviewer',
            description: 'Review code changes',
            claude: {
              userInvocable: false,
              disableModelInvocation: false,
              allowedTools: ['Read', 'Edit'],
              context: 'Review with focus',
              agent: 'reviewer-helper',
              paths: ['src/**']
            }
          })
        })
      );
    });

    await clickSelectOption(user, container, 'availability-mode', '仅手动触发');

    const updateAvailabilityButton = container.querySelector(
      '#update-availability-button'
    ) as HTMLButtonElement | null;
    expect(updateAvailabilityButton).not.toBeNull();
    await user.click(updateAvailabilityButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/skills/skill-1/availability',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            mode: 'manual_only'
          })
        })
      );
    });
  });

  it('fills the root link target path from the directory picker dialog', async () => {
    mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    const chooseDirectoryButton = container.querySelector(
      '#pick-root-target-directory-button'
    ) as HTMLButtonElement | null;
    expect(chooseDirectoryButton).not.toBeNull();
    await user.click(chooseDirectoryButton!);

    const targetInput = container.querySelector('#target-root') as HTMLInputElement | null;
    expect(targetInput).not.toBeNull();

    await waitFor(() => {
      expect(targetInput!.value).toBe('/picked/parent/skills');
    });
  });

  it('copies the selected skill path on double click', async () => {
    mockApiFetch();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => undefined) }
    });

    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    await waitFor(() => {
      expect(container.querySelector('#selected-skill-path')).not.toBeNull();
    });

    const pathNode = container.querySelector('#selected-skill-path') as HTMLElement | null;
    fireEvent.doubleClick(pathNode!);

    expect(await screen.findByText('技能路径已复制')).toBeInTheDocument();
  });

  it('opens local skill resources from the detail shortcuts', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    await waitFor(() => {
      expect(container.querySelector('#open-skill-directory-button')).not.toBeNull();
      expect(container.querySelector('#open-skill-markdown-button')).not.toBeNull();
      expect(container.querySelector('#open-skill-codex-config-button')).not.toBeNull();
    });

    const openDirectoryButton = container.querySelector('#open-skill-directory-button') as HTMLButtonElement | null;
    const openMarkdownButton = container.querySelector('#open-skill-markdown-button') as HTMLButtonElement | null;
    const openCodexConfigButton = container.querySelector('#open-skill-codex-config-button') as HTMLButtonElement | null;

    expect(openDirectoryButton).not.toBeNull();
    expect(openMarkdownButton).not.toBeNull();
    expect(openCodexConfigButton).not.toBeNull();
    expect(openCodexConfigButton).toBeDisabled();

    await user.click(openDirectoryButton!);
    await user.click(openMarkdownButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/open',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            path: '/repo/.claude/skills/reviewer',
            kind: 'directory'
          })
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/open',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            path: '/repo/.claude/skills/reviewer/SKILL.md',
            kind: 'file'
          })
        })
      );
    });

    const openToasts = await screen.findAllByText('已打开本地资源');
    expect(openToasts.length).toBeGreaterThanOrEqual(2);
  });

  it('clears recent actions with one click', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('Skills Manager');
    expect(await screen.findByText('skill.metadata.updated')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '清空最近操作' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/logs',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    expect(await screen.findByText('最近操作已清空')).toBeInTheDocument();
  });

  it('keeps the page interactive when logs come from a legacy backend without undoState', async () => {
    const user = userEvent.setup();
    mockApiFetch({ legacyLogs: true });
    renderApp();

    await screen.findByText('Skills Manager');
    await user.click(await screen.findByRole('button', { name: /skill\.metadata\.updated/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Reviewer').length).toBeGreaterThan(0);
  });

  it('opens log detail modal and allows undo when the log is still reversible', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('Skills Manager');
    await user.click(await screen.findByRole('button', { name: /skill\.metadata\.updated/i }));

    const dialog = await screen.findByRole('dialog', { name: '操作详情' });
    expect(within(dialog).getByText('可撤销')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '撤销此操作' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/logs/log-1/undo',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    expect(await screen.findByText('操作已撤销')).toBeInTheDocument();
  });

  it('hides undo hints and actions for logs that are not currently reversible', async () => {
    const user = userEvent.setup();
    mockApiFetch({ unavailableUndo: true });
    renderApp();

    await screen.findByText('Skills Manager');
    expect(screen.queryByText('不可撤销')).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /skill\.metadata\.updated/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('不可撤销')).toBeNull();
    expect(within(dialog).queryByText('不可撤销原因')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: '撤销此操作' })).toBeNull();
  });

  it('exports recent actions as csv', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:logs');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL
    });

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return {
          click,
          href: '',
          download: ''
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    });

    renderApp();

    await screen.findByText('Skills Manager');
    await user.click(await screen.findByRole('button', { name: '导出 CSV' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/logs/export',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    });

    expect(await screen.findByText('日志已导出')).toBeInTheDocument();
  });

  it('submits the root link form', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    const targetInput = container.querySelector('#target-root') as HTMLInputElement | null;
    expect(targetInput).not.toBeNull();
    await user.clear(targetInput!);
    await user.type(targetInput!, '/target/root');

    const createButton = screen.getByRole('button', { name: '创建整目录链接' });
    await user.click(createButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/links/root',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sourceRootPath: '/repo/.claude/skills',
            targetRootPath: '/target/root'
          })
        })
      );
    });
  });

  it('creates skill links in batch for the selected skills', async () => {
    const fetchMock = mockApiFetch();
    const user = userEvent.setup();
    const { container } = renderApp();

    await screen.findByText('Skills Manager');

    await waitFor(() => {
      expect(container.querySelectorAll('.skill-row .checkbox-row input[type="checkbox"]')).toHaveLength(2);
    });

    const checkboxes = container.querySelectorAll('.skill-row .checkbox-row input[type="checkbox"]');
    await user.click(checkboxes[0] as HTMLInputElement);
    await user.click(checkboxes[1] as HTMLInputElement);

    const chooseDirectoryButton = container.querySelector(
      '#pick-batch-link-target-directory-button'
    ) as HTMLButtonElement | null;
    expect(chooseDirectoryButton).not.toBeNull();
    await user.click(chooseDirectoryButton!);

    const batchCreateButton = container.querySelector(
      '#batch-create-skill-links-button'
    ) as HTMLButtonElement | null;
    expect(batchCreateButton).not.toBeNull();
    await user.click(batchCreateButton!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:3001/api/links/skill/batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            skillIds: ['skill-1', 'skill-2'],
            targetRootPath: '/picked/parent/skills'
          })
        })
      );
    });
  });
});
