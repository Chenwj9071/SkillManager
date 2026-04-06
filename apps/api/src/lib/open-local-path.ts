import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { basename, extname } from 'node:path';

function runOpenCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Failed to open local path (exit code: ${code ?? 'unknown'})`));
    });
  });
}

function quotePowerShell(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildWindowActivationTitles(path: string, kind: 'file' | 'directory') {
  const pathBasename = basename(path);
  const basenameWithoutExtension =
    kind === 'file' ? pathBasename.slice(0, Math.max(0, pathBasename.length - extname(path).length)) : '';

  return [pathBasename, basenameWithoutExtension].filter((value, index, array) => {
    return value.length > 0 && array.indexOf(value) === index;
  });
}

function buildWindowsOpenScript(path: string, kind: 'file' | 'directory') {
  const activationTitles = buildWindowActivationTitles(path, kind)
    .map((value) => quotePowerShell(value))
    .join(', ');

  if (kind === 'directory') {
    return [
      "$ErrorActionPreference='Stop'",
      `$targetPath=${quotePowerShell(path)}`,
      `$activationTitles=@(${activationTitles})`,
      '$shell=New-Object -ComObject WScript.Shell',
      "Start-Process -FilePath 'explorer.exe' -ArgumentList $targetPath | Out-Null",
      'for ($attempt = 0; $attempt -lt 20; $attempt++) {',
      '  foreach ($title in $activationTitles) {',
      '    if ($title -and $shell.AppActivate($title)) {',
      '      exit 0',
      '    }',
      '  }',
      '  Start-Sleep -Milliseconds 250',
      '}',
      'exit 0'
    ].join('; ');
  }

  return [
    "$ErrorActionPreference='Stop'",
    `$targetPath=${quotePowerShell(path)}`,
    `$activationTitles=@(${activationTitles})`,
    '$shell=New-Object -ComObject WScript.Shell',
    'Start-Process -FilePath $targetPath | Out-Null',
    'for ($attempt = 0; $attempt -lt 20; $attempt++) {',
    '  foreach ($title in $activationTitles) {',
    '    if ($title -and $shell.AppActivate($title)) {',
    '      exit 0',
    '    }',
    '  }',
    '  Start-Sleep -Milliseconds 250',
    '}',
    'exit 0'
  ].join('; ');
}

export async function openLocalPath(
  path: string,
  kind: 'file' | 'directory'
): Promise<{ ok: true }> {
  await access(path, constants.F_OK);

  if (process.platform === 'win32') {
    await runOpenCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      buildWindowsOpenScript(path, kind)
    ]);
    return { ok: true };
  }

  if (process.platform === 'darwin') {
    await runOpenCommand('open', [path]);
    return { ok: true };
  }

  await runOpenCommand('xdg-open', [path]);
  return { ok: true };
}
