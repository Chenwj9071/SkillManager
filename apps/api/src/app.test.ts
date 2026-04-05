import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';

const tempDirs: string[] = [];
let tempDataDir = '';

afterEach(async () => {
  delete process.env.SKILL_MANAGER_DATA_DIR;
  while (tempDirs.length > 0) {
    tempDirs.pop();
  }
});

beforeEach(() => {
  tempDataDir = mkdtempSync(join(tmpdir(), 'skill-manager-app-test-'));
  tempDirs.push(tempDataDir);
  process.env.SKILL_MANAGER_DATA_DIR = tempDataDir;
});

describe('api', () => {
  it('returns health status', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('serves bundled web assets when a web dist directory is configured', async () => {
    const webDistDir = mkdtempSync(join(tmpdir(), 'skill-manager-web-'));
    tempDirs.push(webDistDir);
    mkdirSync(join(webDistDir, 'assets'));
    writeFileSync(join(webDistDir, 'index.html'), '<!doctype html><html><body>skills manager</body></html>');
    writeFileSync(join(webDistDir, 'assets', 'app.js'), 'console.log("skill-manager");');

    const app = buildApp({ webDistDir });
    const documentResponse = await app.inject({ method: 'GET', url: '/' });
    const assetResponse = await app.inject({ method: 'GET', url: '/assets/app.js' });

    expect(documentResponse.statusCode).toBe(200);
    expect(documentResponse.body).toContain('skills manager');
    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.body).toContain('skill-manager');
  });

  it('updates availability in batch through the API', async () => {
    let capturedPayload: { skillIds: string[]; mode: string } | null = null;
    const app = buildApp({
      services: {
        skillService: {
          rescan: async () => ({ skills: [] }),
          listSkills: () => [],
          getSkill: async () => null,
          updateAvailability: async () => ({ skills: [] }),
          updateMetadata: async () => ({ skills: [] }),
          deleteSkill: async () => ({ skills: [] }),
          createSkillLink: async () => ({ skills: [] }),
          createRootLink: async () => ({ skills: [] }),
          listLogs: () => [],
          clearLogs: async () => ({ ok: true }),
          updateAvailabilityBatch: async (skillIds, mode) => {
            capturedPayload = { skillIds, mode };
            return { skills: [] };
          }
        }
      }
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/skills/batch-availability',
      payload: {
        skillIds: ['skill-1', 'skill-2'],
        mode: 'manual_only'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(capturedPayload).toEqual({
      skillIds: ['skill-1', 'skill-2'],
      mode: 'manual_only'
    });
  });

  it('clears activity logs through the API', async () => {
    let cleared = false;
    const app = buildApp({
      services: {
        skillService: {
          rescan: async () => ({ skills: [] }),
          listSkills: () => [],
          getSkill: async () => null,
          updateAvailability: async () => ({ skills: [] }),
          updateMetadata: async () => ({ skills: [] }),
          deleteSkill: async () => ({ skills: [] }),
          createSkillLink: async () => ({ skills: [] }),
          createRootLink: async () => ({ skills: [] }),
          listLogs: () => [],
          clearLogs: async () => {
            cleared = true;
            return { ok: true };
          },
          updateAvailabilityBatch: async () => ({ skills: [] })
        }
      }
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/logs'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(cleared).toBe(true);
  });

  it('returns the picked directory path through the dialog API', async () => {
    const app = buildApp({
      directoryPicker: {
        pickDirectory: async () => 'D:\\picked\\skills'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogs/select-directory'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ path: 'D:\\picked\\skills' });
  });
});
