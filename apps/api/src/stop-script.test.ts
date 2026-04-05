import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('workspace stop script', () => {
  it('stops the background server from the pid file instead of port polling', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'stop-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('pids.json');
    expect(script).toContain('Stop-Process');
    expect(script).not.toContain('Get-NetTCPConnection');
  });
});

describe('packaged stop script', () => {
  it('stops the background server from the pid file instead of port polling', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'local-app', 'stop-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('pids.json');
    expect(script).toContain('Stop-Process');
    expect(script).not.toContain('Get-NetTCPConnection');
  });
});
