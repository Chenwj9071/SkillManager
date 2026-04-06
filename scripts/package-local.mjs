import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const releaseName = `skills-manager-local-${process.platform}-${process.arch}`;
const releaseRoot = resolve(repoRoot, 'release', releaseName);
const packageRoot = resolve(releaseRoot, 'package');
const nodeBinaryName = basename(process.execPath);

async function readPackageVersion() {
  const packageJsonPath = resolve(repoRoot, 'package.json');
  const packageJson = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(packageJsonPath, 'utf8')));
  return String(packageJson.version ?? '0.1.0');
}

async function copyPath(source, destination) {
  await cp(source, destination, {
    force: true,
    recursive: true
  });
}

async function main() {
  const version = await readPackageVersion();
  await rm(releaseRoot, { recursive: true, force: true });
  await mkdir(resolve(packageRoot, 'app', 'api'), { recursive: true });
  await mkdir(resolve(packageRoot, 'app', 'web'), { recursive: true });
  await mkdir(resolve(packageRoot, 'runtime'), { recursive: true });
  await mkdir(resolve(packageRoot, 'scripts'), { recursive: true });

  await copyPath(resolve(repoRoot, 'apps', 'api', 'dist'), resolve(packageRoot, 'app', 'api'));
  await copyPath(resolve(repoRoot, 'apps', 'web', 'dist'), resolve(packageRoot, 'app', 'web'));

  await copyFile(process.execPath, resolve(packageRoot, 'runtime', nodeBinaryName));
  await copyFile(resolve(repoRoot, 'scripts', 'local-app', 'install.ps1'), resolve(releaseRoot, 'install.ps1'));
  await copyFile(resolve(repoRoot, 'scripts', 'local-app', 'install.cmd'), resolve(releaseRoot, 'install.cmd'));
  await copyFile(resolve(repoRoot, 'scripts', 'local-app', 'start-app.ps1'), resolve(packageRoot, 'scripts', 'start-app.ps1'));
  await copyFile(resolve(repoRoot, 'scripts', 'local-app', 'stop-app.ps1'), resolve(packageRoot, 'scripts', 'stop-app.ps1'));
  await copyFile(resolve(repoRoot, 'scripts', 'local-app', 'start-app.cmd'), resolve(packageRoot, 'start-app.cmd'));
  await copyFile(resolve(repoRoot, 'scripts', 'local-app', 'stop-app.cmd'), resolve(packageRoot, 'stop-app.cmd'));
  await copyFile(resolve(repoRoot, 'installer', 'windows', 'assets', 'skill-manager.ico'), resolve(packageRoot, 'skill-manager.ico'));
  await copyFile(resolve(repoRoot, 'README.md'), resolve(releaseRoot, 'README.md'));

  const manifest = {
    name: 'Skills Manager',
    version,
    platform: process.platform,
    arch: process.arch,
    builtAt: new Date().toISOString(),
    entrypoints: {
      install: 'install.cmd',
      start: 'start-app.cmd',
      stop: 'stop-app.cmd'
    },
    runtime: {
      nodeBinary: `runtime/${nodeBinaryName}`,
      apiEntry: 'app/api/server.cjs',
      webDist: 'app/web'
    }
  };

  await writeFile(resolve(releaseRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`[Skills Manager] Local package created at ${releaseRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
