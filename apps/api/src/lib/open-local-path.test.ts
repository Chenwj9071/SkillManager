import { afterEach, describe, expect, it, vi } from 'vitest';

const accessMock = vi.fn();
const spawnMock = vi.fn();

vi.mock('node:fs/promises', () => ({
  access: accessMock
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock
}));

describe('openLocalPath', () => {
  afterEach(() => {
    accessMock.mockReset();
    spawnMock.mockReset();
  });

  it('uses AppActivate to bring opened Windows resources to the foreground when possible', async () => {
    accessMock.mockResolvedValue(undefined);
    const onceMock = vi.fn((event: string, handler: (value?: unknown) => void) => {
      if (event === 'exit') {
        handler(0);
      }

      return childProcess;
    });
    const childProcess = { once: onceMock };
    spawnMock.mockReturnValue(childProcess);

    const previousPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const { openLocalPath } = await import('./open-local-path');

    await expect(openLocalPath('D:\\skills\\reviewer\\SKILL.md', 'file')).resolves.toEqual({
      ok: true
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnMock.mock.calls[0];

    expect(command).toBe('powershell.exe');
    expect(args).toHaveLength(3);
    expect(args[0]).toBe('-NoProfile');
    expect(args[1]).toBe('-Command');
    expect(args[2]).toContain('AppActivate');
    expect(args[2]).toContain('Start-Process -FilePath $targetPath');
    expect(args[2]).toContain("$activationTitles=@('SKILL.md', 'SKILL')");
    expect(options).toEqual(
      expect.objectContaining({
        stdio: 'ignore',
        windowsHide: true
      })
    );

    Object.defineProperty(process, 'platform', { value: previousPlatform });
  });
});
