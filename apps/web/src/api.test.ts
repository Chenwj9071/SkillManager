import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addDirectory,
  deleteDirectory,
  fetchLogDetail,
  fetchLogs,
  pickDirectory,
  rescanSkills
} from './api';

function mockFetch() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '{}'
  })) as unknown as typeof fetch;

  globalThis.fetch = fetchMock;
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api request helper', () => {
  it('omits json headers for requests without a body', async () => {
    const fetchMock = mockFetch();

    await rescanSkills();
    await pickDirectory();
    await deleteDirectory('dir-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:3001/api/scan',
      expect.not.objectContaining({
        headers: expect.anything()
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:3001/api/dialogs/select-directory',
      expect.not.objectContaining({
        headers: expect.anything()
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:3001/api/directories/dir-1',
      expect.not.objectContaining({
        headers: expect.anything()
      })
    );
  });

  it('keeps json headers for requests with a body', async () => {
    const fetchMock = mockFetch();

    await addDirectory({
      path: '/custom/skills',
      toolType: 'generic',
      scope: 'custom'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/directories',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  });

  it('extracts message from json error responses', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => JSON.stringify({ message: '目标路径已存在，无法创建链接' })
    })) as unknown as typeof fetch;

    await expect(
      addDirectory({
        path: '/custom/skills',
        toolType: 'generic',
        scope: 'custom'
      })
    ).rejects.toThrow('目标路径已存在，无法创建链接');
  });

  it('normalizes legacy log payloads that do not include undoState', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(input).endsWith('/api/logs/legacy-log')
          ? {
              log: {
                id: 'legacy-log',
                action: 'directory.added',
                targetType: 'directory',
                targetPath: '/custom/skills',
                detail: {},
                createdAt: '2026-04-06T07:29:26.738Z'
              }
            }
          : {
              logs: [
                {
                  id: 'legacy-log',
                  action: 'directory.added',
                  targetType: 'directory',
                  targetPath: '/custom/skills',
                  detail: {},
                  createdAt: '2026-04-06T07:29:26.738Z'
                }
              ]
            },
      text: async () => '{}'
    })) as unknown as typeof fetch;

    const logsResponse = await fetchLogs();
    const logDetailResponse = await fetchLogDetail('legacy-log');

    expect(logsResponse.logs[0].undoState).toEqual({
      supported: false,
      available: false,
      reason: null
    });
    expect(logDetailResponse.log.undoState).toEqual({
      supported: false,
      available: false,
      reason: null
    });
  });
});
