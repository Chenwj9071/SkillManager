import { execFile } from 'node:child_process';

export interface DirectoryPicker {
  pickDirectory(): Promise<string | null>;
}

function runCommand(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });
}

async function pickOnWindows() {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '[System.Windows.Forms.Application]::EnableVisualStyles()',
    '$owner = New-Object System.Windows.Forms.Form',
    '$owner.TopMost = $true',
    '$owner.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen',
    '$owner.ShowInTaskbar = $false',
    '$owner.Opacity = 0',
    '$owner.Width = 1',
    '$owner.Height = 1',
    '$owner.Show()',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$dialog.Description = "Select a directory"',
    '$dialog.UseDescriptionForTitle = $true',
    'if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {',
    '  Write-Output $dialog.SelectedPath',
    '}',
    '$owner.Close()'
  ].join('; ');
  const output = await runCommand('powershell.exe', ['-NoProfile', '-STA', '-Command', script]);
  return output || null;
}

async function pickOnMac() {
  const output = await runCommand('osascript', [
    '-e',
    'set chosenFolder to POSIX path of (choose folder with prompt "Select a directory")',
    '-e',
    'return chosenFolder'
  ]);
  return output || null;
}

async function pickOnLinux() {
  try {
    const zenityPath = await runCommand('sh', ['-lc', 'command -v zenity']);
    if (zenityPath) {
      const output = await runCommand(zenityPath, ['--file-selection', '--directory', '--title=Select a directory']);
      return output || null;
    }
  } catch {
    // Ignore and try kdialog.
  }

  try {
    const kdialogPath = await runCommand('sh', ['-lc', 'command -v kdialog']);
    if (kdialogPath) {
      const output = await runCommand(kdialogPath, ['--getexistingdirectory', '.']);
      return output || null;
    }
  } catch {
    // Ignore and throw below.
  }

  throw new Error('No supported directory picker was found. Install zenity or kdialog, or enter the path manually.');
}

export function buildDirectoryPicker(): DirectoryPicker {
  return {
    async pickDirectory() {
      if (process.platform === 'win32') {
        return pickOnWindows();
      }

      if (process.platform === 'darwin') {
        return pickOnMac();
      }

      return pickOnLinux();
    }
  };
}
