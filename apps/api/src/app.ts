import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  addDirectoryInputSchema,
  createRootLinkInputSchema,
  createSkillLinkInputSchema,
  updateSkillAvailabilityBatchInputSchema,
  updateSkillAvailabilityInputSchema,
  updateSkillMetadataInputSchema
} from '@skill-manager/shared';
import { buildDirectoryPicker, type DirectoryPicker } from './lib/directory-picker';
import { buildDirectoryService } from './lib/services/directory-service';
import { buildSkillService } from './lib/services/skill-service';

const contentTypeByExtension: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

function resolveStaticFile(webDistDir: string, requestPath: string) {
  const normalizedPath = requestPath.replace(/^\/+/, '');
  const candidatePath = resolve(webDistDir, normalizedPath);

  if (!candidatePath.startsWith(webDistDir)) {
    return null;
  }

  if (!existsSync(candidatePath)) {
    return null;
  }

  const stats = statSync(candidatePath);
  return stats.isFile() ? candidatePath : null;
}

async function replyWithFile(reply: ReturnType<ReturnType<typeof Fastify>['reply']>, filePath: string) {
  const extension = extname(filePath);
  const contentType = contentTypeByExtension[extension] ?? 'application/octet-stream';
  const body = await readFile(filePath);

  reply.type(contentType);
  return reply.send(body);
}

type DirectoryService = ReturnType<typeof buildDirectoryService>;
type SkillService = ReturnType<typeof buildSkillService>;

interface BuildAppOptions {
  webDistDir?: string | null;
  services?: {
    directoryService?: DirectoryService;
    skillService?: SkillService;
  };
  directoryPicker?: DirectoryPicker;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: false });
  const directoryService = options.services?.directoryService ?? buildDirectoryService();
  const skillService = options.services?.skillService ?? buildSkillService();
  const directoryPicker = options.directoryPicker ?? buildDirectoryPicker();
  const webDistDir = options.webDistDir ? resolve(options.webDistDir) : null;

  app.register(cors, { origin: true });

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/directories', async () => ({ directories: directoryService.listDirectories() }));
  app.post('/api/directories', async (request, reply) => {
    const input = addDirectoryInputSchema.parse(request.body);
    const directory = directoryService.addDirectory(input);
    reply.code(201);
    return { directory };
  });
  app.delete('/api/directories/:id', async (request) => {
    const params = request.params as { id: string };
    directoryService.deleteDirectory(params.id);
    return { ok: true };
  });

  app.post('/api/scan', async () => skillService.rescan());
  app.get('/api/skills', async () => {
    const skills = skillService.listSkills();
    return skills.length ? { skills } : skillService.rescan();
  });
  app.get('/api/skills/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const skill = await skillService.getSkill(params.id);
    if (!skill) {
      reply.code(404);
      return { message: 'Skill not found' };
    }

    return { skill };
  });
  app.patch('/api/skills/:id/availability', async (request) => {
    const params = request.params as { id: string };
    const input = updateSkillAvailabilityInputSchema.parse(request.body);
    return skillService.updateAvailability(params.id, input.mode);
  });
  app.patch('/api/skills/batch-availability', async (request) => {
    const input = updateSkillAvailabilityBatchInputSchema.parse(request.body);
    return skillService.updateAvailabilityBatch(input.skillIds, input.mode);
  });
  app.patch('/api/skills/:id/metadata', async (request) => {
    const params = request.params as { id: string };
    const input = updateSkillMetadataInputSchema.parse(request.body);
    return skillService.updateMetadata(params.id, input);
  });
  app.delete('/api/skills/:id', async (request) => {
    const params = request.params as { id: string };
    return skillService.deleteSkill(params.id);
  });
  app.post('/api/links/skill', async (request) => {
    const input = createSkillLinkInputSchema.parse(request.body);
    return skillService.createSkillLink(input);
  });
  app.post('/api/links/root', async (request) => {
    const input = createRootLinkInputSchema.parse(request.body);
    return skillService.createRootLink(input);
  });
  app.get('/api/logs', async () => ({ logs: skillService.listLogs() }));
  app.delete('/api/logs', async () => skillService.clearLogs());
  app.post('/api/dialogs/select-directory', async () => ({
    path: await directoryPicker.pickDirectory()
  }));

  if (webDistDir) {
    app.get('/', async (_request, reply) => {
      const indexPath = resolve(webDistDir, 'index.html');
      return replyWithFile(reply, indexPath);
    });

    app.get('/*', async (request, reply) => {
      const params = request.params as { '*': string };
      const requestPath = params['*'] || '';

      if (requestPath.startsWith('api/')) {
        reply.code(404);
        return { message: 'Not found' };
      }

      const assetPath = resolveStaticFile(webDistDir, requestPath);
      if (assetPath) {
        return replyWithFile(reply, assetPath);
      }

      if (extname(requestPath)) {
        reply.code(404);
        return { message: 'Static asset not found' };
      }

      return replyWithFile(reply, resolve(webDistDir, 'index.html'));
    });
  }

  return app;
}
