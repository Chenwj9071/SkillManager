import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const serverEntry = resolve(repoRoot, 'apps/api/dist/server.cjs');
const webDistDir = resolve(repoRoot, 'apps/web/dist');
const buildCommand = process.platform === 'win32' ? 'cmd.exe' : 'corepack';
const buildArgs =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'corepack', 'pnpm', 'build']
    : ['pnpm', 'build'];

const buildResult = spawnSync(buildCommand, buildArgs, {
  cwd: repoRoot,
  stdio: 'inherit'
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

if (!existsSync(serverEntry)) {
  throw new Error(`Missing built API server at ${serverEntry}`);
}

if (!existsSync(webDistDir)) {
  throw new Error(`Missing built web assets at ${webDistDir}`);
}

process.env.SKILL_MANAGER_HOST = '127.0.0.1';
process.env.SKILL_MANAGER_PORT = '3001';
process.env.SKILL_MANAGER_WEB_DIST = webDistDir;

await import(pathToFileURL(serverEntry).href);
