import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('windows installer script', () => {
  it('creates the desktop shortcut by default', () => {
    const scriptPath = resolve(process.cwd(), 'installer', 'windows', 'skills-manager.iss');
    const script = readFileSync(scriptPath, 'utf8');

    expect(script).toContain('Name: "{autodesktop}\\Skills Manager"; Filename: "{app}\\start-app.cmd"; WorkingDir: "{app}"');
    expect(script).not.toContain('Tasks: desktopicon');
  });
});
