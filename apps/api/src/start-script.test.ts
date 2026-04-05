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
});
