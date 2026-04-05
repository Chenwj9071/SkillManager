import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const startScript = resolve(repoRoot, 'scripts/start-e2e-server.mjs');
const testCommand = process.platform === 'win32' ? 'cmd.exe' : 'corepack';
const testArgs =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'corepack', 'pnpm', 'exec', 'playwright', 'test']
    : ['pnpm', 'exec', 'playwright', 'test'];
const serverUrl = 'http://127.0.0.1:3001/api/health';

async function isServerReady() {
  try {
    const response = await fetch(serverUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServerReady(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isServerReady()) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${serverUrl}`);
}

function stopServer(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore'
    });
    return;
  }

  child.kill('SIGTERM');
}

let serverProcess = null;
let startedManagedServer = false;

let exitCode = 1;

try {
  if (await isServerReady()) {
    console.log('[Skills Manager] Reusing existing server on http://127.0.0.1:3001');
  } else {
    serverProcess = spawn(process.execPath, [startScript], {
      cwd: repoRoot,
      stdio: 'inherit',
      windowsHide: true
    });
    startedManagedServer = true;
    await waitForServerReady();
  }

  const testRun = spawnSync(testCommand, testArgs, {
    cwd: repoRoot,
    stdio: 'inherit'
  });

  exitCode = testRun.status ?? 1;
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  if (startedManagedServer && serverProcess) {
    stopServer(serverProcess);
  }
}

process.exit(exitCode);
