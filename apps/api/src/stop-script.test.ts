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

  it('can stop a stale managed process that is still listening on the app port', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'stop-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('netstat -ano -p tcp');
    expect(script).toContain('Get-CimInstance Win32_Process');
    expect(script).toContain("Join-Path $repoRoot 'apps\\api\\dist\\server.cjs'");
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

  it('can stop a stale packaged process that is still listening on the app port', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'local-app', 'stop-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('netstat -ano -p tcp');
    expect(script).toContain('Get-CimInstance Win32_Process');
    expect(script).toContain("Join-Path $appRoot 'app\\api\\server.cjs'");
  });
});
