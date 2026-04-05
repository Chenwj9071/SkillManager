import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const releaseRoot = resolve(repoRoot, 'release', 'skills-manager-local-win32-x64');
const installerScript = resolve(repoRoot, 'installer', 'windows', 'skills-manager.iss');
const outputDir = resolve(repoRoot, 'release', 'skills-manager-setup-win32-x64');

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveIsccPath() {
  const candidates = [
    process.env.INNO_SETUP_COMPILER,
    resolve(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && (await pathExists(candidate))) {
      return candidate;
    }
  }

  throw new Error('ISCC.exe was not found. Install Inno Setup or set INNO_SETUP_COMPILER.');
}

async function readManifest() {
  const manifestPath = resolve(releaseRoot, 'manifest.json');
  if (!(await pathExists(manifestPath))) {
    throw new Error(`Release manifest not found at ${manifestPath}. Run corepack pnpm package:local first.`);
  }

  const manifest = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(manifestPath, 'utf8')));
  return manifest;
}

function runCommand(command, args, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} exited with code ${code}`));
    });

    child.on('error', rejectPromise);
  });
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('Windows installer packaging is only supported on Windows.');
  }

  const manifest = await readManifest();
  const isccPath = await resolveIsccPath();
  await mkdir(outputDir, { recursive: true });

  const args = [
    `/DMyAppVersion=${manifest.version}`,
    `/DMySourceDir=${releaseRoot}`,
    `/DMyOutputDir=${outputDir}`,
    installerScript
  ];

  await runCommand(isccPath, args, repoRoot);

  console.log(`[Skills Manager] Windows installer created at ${resolve(outputDir, 'SkillsManagerSetup.exe')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
