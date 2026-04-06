import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('workspace start script', () => {
  it('uses a single production server instead of tsx and vite windows', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'start-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('corepack pnpm build');
    expect(script).toContain("Join-Path $repoRoot 'apps\\api\\dist\\server.cjs'");
    expect(script).toContain("Join-Path $repoRoot 'apps\\web\\dist'");
    expect(script).toContain('-WindowStyle Hidden');
    expect(script).not.toContain('tsx.cmd');
    expect(script).not.toContain('vite.cmd');
    expect(script).not.toContain('4173');
  });

  it('checks service readiness through the health endpoint instead of Get-NetTCPConnection polling', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'start-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('/api/health');
    expect(script).toContain('Invoke-WebRequest');
    expect(script).not.toContain('Get-NetTCPConnection');
  });

  it('reconciles stale managed processes by inspecting the port listener and process command line', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'start-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('netstat -ano -p tcp');
    expect(script).toContain('Get-CimInstance Win32_Process');
    expect(script).toContain('Stopping stale Skills Manager process');
  });
});

describe('packaged start script', () => {
  it('uses the health endpoint instead of Get-NetTCPConnection polling', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'local-app', 'start-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('/api/health');
    expect(script).toContain('Invoke-WebRequest');
    expect(script).not.toContain('Get-NetTCPConnection');
  });

  it('reconciles stale managed processes before starting a new packaged server', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'local-app', 'start-app.ps1');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('netstat -ano -p tcp');
    expect(script).toContain('Get-CimInstance Win32_Process');
    expect(script).toContain('Stopping stale Skills Manager process');
  });
});
