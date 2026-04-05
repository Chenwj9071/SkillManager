import { describe, expect, it } from 'vitest';
import { getServerConfig } from './server-config';

describe('getServerConfig', () => {
  it('uses default host and port when env is missing', () => {
    const config = getServerConfig({});

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3001);
    expect(config.webDistDir).toBeNull();
  });

  it('reads runtime values from env', () => {
    const config = getServerConfig({
      SKILL_MANAGER_HOST: '0.0.0.0',
      SKILL_MANAGER_PORT: '4310',
      SKILL_MANAGER_WEB_DIST: './apps/web/dist'
    });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(4310);
    expect(config.webDistDir).toContain('apps\\web\\dist');
  });
});
