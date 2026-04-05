import { resolve } from 'node:path';

export interface ServerConfig {
  host: string;
  port: number;
  webDistDir: string | null;
}

export function getServerConfig(
  env: Record<string, string | undefined> = process.env
): ServerConfig {
  const host = env.SKILL_MANAGER_HOST?.trim() || '127.0.0.1';
  const portValue = Number.parseInt(env.SKILL_MANAGER_PORT?.trim() || '3001', 10);
  const webDistValue = env.SKILL_MANAGER_WEB_DIST?.trim();

  return {
    host,
    port: Number.isNaN(portValue) ? 3001 : portValue,
    webDistDir: webDistValue ? resolve(webDistValue) : null
  };
}
