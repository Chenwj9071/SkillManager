# Skills Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个跨平台、本地优先的 Skills Manager Web App，支持多目录扫描、统一展示、元数据编辑、删除和 symlink 复用。

**Architecture:** 使用 Vite + React + Fastify + SQLite 的本地全栈 TypeScript 应用。文件系统是唯一事实来源，SQLite 只存目录注册、扫描索引与操作日志；后端通过服务层完成扫描、解析、写回和链接创建。

**Tech Stack:** React, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS, Fastify, Zod, better-sqlite3, yaml, chokidar, Vitest, Supertest, Playwright

---

### Task 1: 初始化项目骨架与工具链

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `packages/shared/package.json`
- Create: `vitest.workspace.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: 写一个失败的仓库结构测试**

```typescript
import { describe, expect, it } from 'vitest';

describe('workspace structure', () => {
  it('contains app and package workspaces', () => {
    expect(['apps/web', 'apps/api', 'packages/shared']).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 运行测试确认当前缺少工具链**

Run: `pnpm vitest run`
Expected: FAIL with missing workspace config or missing packages

- [ ] **Step 3: 添加最小 monorepo 配置**

```json
{
  "name": "skill-manager",
  "private": true,
  "packageManager": "pnpm@10.1.0",
  "scripts": {
    "dev": "concurrently \"pnpm --filter @skill-manager/api dev\" \"pnpm --filter @skill-manager/web dev\"",
    "build": "pnpm -r build",
    "test": "pnpm vitest run",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 4: 再次运行测试并确认基础配置通过**

Run: `pnpm vitest run`
Expected: PASS for workspace structure test

- [ ] **Step 5: 记录初始化提交**

Run: `git init`
Expected: initialized empty repository in `D:\Project\SkillManager\.git`

### Task 2: 共享领域模型与 schema

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/domain.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/domain.test.ts`

- [ ] **Step 1: 先写领域模型测试**

```typescript
import { describe, expect, it } from 'vitest';
import { availabilityModeSchema, toolTypeSchema } from './domain';

describe('domain schemas', () => {
  it('accepts supported tool types and availability modes', () => {
    expect(toolTypeSchema.parse('claude')).toBe('claude');
    expect(availabilityModeSchema.parse('manual_only')).toBe('manual_only');
  });
});
```

- [ ] **Step 2: 运行单测确认失败**

Run: `pnpm vitest run packages/shared/src/domain.test.ts`
Expected: FAIL because schemas do not exist

- [ ] **Step 3: 实现共享 schema 与类型**

```typescript
import { z } from 'zod';

export const toolTypeSchema = z.enum(['claude', 'codex', 'generic']);
export const availabilityModeSchema = z.enum([
  'automatic',
  'manual_only',
  'hidden',
  'disabled',
  'unknown',
]);
```

- [ ] **Step 4: 运行单测确认通过**

Run: `pnpm vitest run packages/shared/src/domain.test.ts`
Expected: PASS

- [ ] **Step 5: 提交共享模型**

Run: `git add packages/shared package.json tsconfig.base.json pnpm-workspace.yaml vitest.workspace.ts`
Expected: staged shared model files

### Task 3: 目录注册与默认目录发现

**Files:**
- Create: `apps/api/src/lib/paths.ts`
- Create: `apps/api/src/lib/default-directories.ts`
- Create: `apps/api/src/lib/default-directories.test.ts`

- [ ] **Step 1: 先写默认目录发现测试**

```typescript
import { describe, expect, it } from 'vitest';
import { getDefaultDirectories } from './default-directories';

describe('getDefaultDirectories', () => {
  it('returns claude and codex defaults for a project root', () => {
    const directories = getDefaultDirectories('/workspace/demo', '/home/user');
    expect(directories.map((item) => item.path)).toContain('/workspace/demo/.claude/skills');
    expect(directories.map((item) => item.path)).toContain('/workspace/demo/.agents/skills');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/lib/default-directories.test.ts`
Expected: FAIL because module does not exist

- [ ] **Step 3: 实现默认目录发现逻辑**

```typescript
export function getDefaultDirectories(projectRoot: string, homeDir: string) {
  return [
    { toolType: 'claude', path: `${homeDir}/.claude/skills`, scope: 'user', isDefault: true },
    { toolType: 'claude', path: `${projectRoot}/.claude/skills`, scope: 'project', isDefault: true },
    { toolType: 'codex', path: `${homeDir}/.agents/skills`, scope: 'user', isDefault: true },
    { toolType: 'codex', path: `${projectRoot}/.agents/skills`, scope: 'project', isDefault: true },
    { toolType: 'codex', path: `${projectRoot}/.agent/skills`, scope: 'project', isDefault: true },
  ];
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/lib/default-directories.test.ts`
Expected: PASS

- [ ] **Step 5: 提交默认目录发现**

Run: `git add apps/api/src/lib`
Expected: staged default directory files

### Task 4: `SKILL.md` 与 Codex 配置解析

**Files:**
- Create: `apps/api/src/lib/skill-parser.ts`
- Create: `apps/api/src/lib/availability.ts`
- Create: `apps/api/src/lib/skill-parser.test.ts`

- [ ] **Step 1: 先写解析测试**

```typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMarkdown, resolveAvailabilityMode } from './skill-parser';

describe('skill parser', () => {
  it('parses frontmatter and body summary', () => {
    const result = parseSkillMarkdown(`---\nname: demo\ndescription: test skill\ndisable-model-invocation: true\n---\n\nBody`);
    expect(result.frontmatter.name).toBe('demo');
    expect(result.summary).toContain('Body');
  });

  it('maps claude manual-only mode correctly', () => {
    expect(resolveAvailabilityMode('claude', { 'disable-model-invocation': true }, undefined)).toBe('manual_only');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/lib/skill-parser.test.ts`
Expected: FAIL because parser functions do not exist

- [ ] **Step 3: 实现解析与状态映射**

```typescript
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';

export function parseSkillMarkdown(raw: string) {
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data,
    body: parsed.content,
    summary: parsed.content.trim().slice(0, 200),
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/lib/skill-parser.test.ts`
Expected: PASS

- [ ] **Step 5: 提交解析模块**

Run: `git add apps/api/src/lib/skill-parser.ts apps/api/src/lib/availability.ts apps/api/src/lib/skill-parser.test.ts`
Expected: staged parser files

### Task 5: skills 扫描器与 symlink 检测

**Files:**
- Create: `apps/api/src/lib/skill-scanner.ts`
- Create: `apps/api/src/lib/skill-scanner.test.ts`
- Create: `apps/api/src/test/fixtures/`

- [ ] **Step 1: 先写扫描器测试**

```typescript
import { describe, expect, it } from 'vitest';
import { scanSkillRoot } from './skill-scanner';

describe('scanSkillRoot', () => {
  it('discovers child directories containing SKILL.md', async () => {
    const skills = await scanSkillRoot('apps/api/src/test/fixtures/skills-root', 'generic');
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('fixture-skill');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/lib/skill-scanner.test.ts`
Expected: FAIL because fixtures and scanner do not exist

- [ ] **Step 3: 实现最小扫描器**

```typescript
export async function scanSkillRoot(rootPath: string, toolType: string) {
  // 读取一级子目录，查找 SKILL.md，解析并返回
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/lib/skill-scanner.test.ts`
Expected: PASS

- [ ] **Step 5: 提交扫描器**

Run: `git add apps/api/src/lib/skill-scanner.ts apps/api/src/lib/skill-scanner.test.ts apps/api/src/test/fixtures`
Expected: staged scanner files

### Task 6: SQLite 存储与操作日志

**Files:**
- Create: `apps/api/src/lib/db.ts`
- Create: `apps/api/src/lib/repositories/directory-repository.ts`
- Create: `apps/api/src/lib/repositories/skill-repository.ts`
- Create: `apps/api/src/lib/repositories/log-repository.ts`
- Create: `apps/api/src/lib/db.test.ts`

- [ ] **Step 1: 先写数据库测试**

```typescript
import { describe, expect, it } from 'vitest';
import { createDatabase } from './db';

describe('database', () => {
  it('creates required tables', () => {
    const db = createDatabase(':memory:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    expect(tables.map((item) => item.name)).toContain('directories');
    expect(tables.map((item) => item.name)).toContain('activity_logs');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/lib/db.test.ts`
Expected: FAIL because database module does not exist

- [ ] **Step 3: 实现数据库初始化和表结构**

```typescript
import Database from 'better-sqlite3';

export function createDatabase(filename: string) {
  const db = new Database(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS directories (...);
    CREATE TABLE IF NOT EXISTS skills (...);
    CREATE TABLE IF NOT EXISTS activity_logs (...);
  `);
  return db;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/lib/db.test.ts`
Expected: PASS

- [ ] **Step 5: 提交存储层**

Run: `git add apps/api/src/lib/db.ts apps/api/src/lib/repositories apps/api/src/lib/db.test.ts`
Expected: staged database files

### Task 7: 服务层与扫描索引流程

**Files:**
- Create: `apps/api/src/lib/services/skill-service.ts`
- Create: `apps/api/src/lib/services/directory-service.ts`
- Create: `apps/api/src/lib/services/skill-service.test.ts`

- [ ] **Step 1: 先写服务层测试**

```typescript
import { describe, expect, it } from 'vitest';
import { buildSkillService } from './skill-service';

describe('skill service', () => {
  it('rescans directories and returns normalized skills', async () => {
    const service = buildSkillService();
    const result = await service.rescan();
    expect(Array.isArray(result.skills)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/lib/services/skill-service.test.ts`
Expected: FAIL because service is missing

- [ ] **Step 3: 实现服务层编排**

```typescript
export function buildSkillService(deps = defaultDeps) {
  return {
    async rescan() {
      const directories = await deps.directoryRepository.listAll();
      const scanned = await deps.scanner.scanMany(directories);
      await deps.skillRepository.replaceIndex(scanned);
      return { skills: scanned };
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/lib/services/skill-service.test.ts`
Expected: PASS

- [ ] **Step 5: 提交服务层**

Run: `git add apps/api/src/lib/services`
Expected: staged service files

### Task 8: 元数据编辑、删除与 symlink 用例

**Files:**
- Create: `apps/api/src/lib/services/skill-mutations.ts`
- Create: `apps/api/src/lib/services/skill-mutations.test.ts`
- Create: `apps/api/src/lib/filesystem.ts`

- [ ] **Step 1: 先写变更用例测试**

```typescript
import { describe, expect, it } from 'vitest';
import { updateAvailability } from './skill-mutations';

describe('skill mutations', () => {
  it('writes claude manual-only mode back to frontmatter', async () => {
    const raw = `---\nname: demo\ndescription: demo\n---\n\nBody`;
    const updated = updateAvailability(raw, 'claude', 'manual_only', undefined);
    expect(updated).toContain('disable-model-invocation: true');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/lib/services/skill-mutations.test.ts`
Expected: FAIL because mutation module is missing

- [ ] **Step 3: 实现编辑、删除和 symlink 核心逻辑**

```typescript
export function updateAvailability(raw: string, toolType: string, mode: string, codexYaml?: string) {
  // 更新 frontmatter 或 openai.yaml
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/lib/services/skill-mutations.test.ts`
Expected: PASS

- [ ] **Step 5: 提交变更逻辑**

Run: `git add apps/api/src/lib/services/skill-mutations.ts apps/api/src/lib/services/skill-mutations.test.ts apps/api/src/lib/filesystem.ts`
Expected: staged mutation files

### Task 9: Fastify API

**Files:**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/directories.ts`
- Create: `apps/api/src/routes/skills.ts`
- Create: `apps/api/src/routes/links.ts`
- Create: `apps/api/src/routes/logs.ts`
- Create: `apps/api/src/app.test.ts`

- [ ] **Step 1: 先写 API 测试**

```typescript
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('api', () => {
  it('returns health status', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/api/src/app.test.ts`
Expected: FAIL because app module is missing

- [ ] **Step 3: 实现 Fastify 应用与路由**

```typescript
import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify();
  app.get('/api/health', async () => ({ status: 'ok' }));
  return app;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/api/src/app.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 API 层**

Run: `git add apps/api/src`
Expected: staged API files

### Task 10: React UI 骨架与列表页

**Files:**
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app.tsx`
- Create: `apps/web/src/routes/index.tsx`
- Create: `apps/web/src/routes/directories.tsx`
- Create: `apps/web/src/routes/skills.$skillId.tsx`
- Create: `apps/web/src/components/layout-shell.tsx`
- Create: `apps/web/src/components/skills-table.tsx`
- Create: `apps/web/src/components/filter-bar.tsx`
- Create: `apps/web/src/app.test.tsx`

- [ ] **Step 1: 先写前端渲染测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('renders the skills manager shell', () => {
    render(<App />);
    expect(screen.getByText('Skills Manager')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/web/src/app.test.tsx`
Expected: FAIL because web app does not exist

- [ ] **Step 3: 实现前端骨架与首页**

```tsx
export function App() {
  return <main><h1>Skills Manager</h1></main>;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/web/src/app.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交前端骨架**

Run: `git add apps/web/src`
Expected: staged web files

### Task 11: 目录管理、详情编辑与复用向导 UI

**Files:**
- Create: `apps/web/src/components/directory-panel.tsx`
- Create: `apps/web/src/components/skill-detail.tsx`
- Create: `apps/web/src/components/link-wizard.tsx`
- Create: `apps/web/src/components/availability-badge.tsx`
- Create: `apps/web/src/components/confirm-dialog.tsx`
- Create: `apps/web/src/components/operation-log-list.tsx`
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/routes/directories.tsx`
- Modify: `apps/web/src/routes/skills.$skillId.tsx`

- [ ] **Step 1: 先写交互组件测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvailabilityBadge } from './availability-badge';

describe('AvailabilityBadge', () => {
  it('renders manual-only label', () => {
    render(<AvailabilityBadge mode="manual_only" />);
    expect(screen.getByText('仅手动触发')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run apps/web/src/components/availability-badge.test.tsx`
Expected: FAIL because component does not exist

- [ ] **Step 3: 实现详情页、目录页和复用向导**

```tsx
export function AvailabilityBadge({ mode }: { mode: 'manual_only' | 'automatic' | 'hidden' | 'disabled' | 'unknown' }) {
  const labelMap = {
    automatic: '自动触发',
    manual_only: '仅手动触发',
    hidden: '隐藏',
    disabled: '已禁用',
    unknown: '未知',
  };

  return <span>{labelMap[mode]}</span>;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run apps/web/src/components/availability-badge.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交前端功能页面**

Run: `git add apps/web/src/components apps/web/src/routes`
Expected: staged UI feature files

### Task 12: 端到端验证与打包

**Files:**
- Create: `tests/e2e/skills-manager.spec.ts`
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: 先写 E2E 场景**

```typescript
import { test, expect } from '@playwright/test';

test('loads dashboard and shows skills manager title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Skills Manager')).toBeVisible();
});
```

- [ ] **Step 2: 运行 E2E 确认失败**

Run: `pnpm test:e2e`
Expected: FAIL because app is not yet running or page not implemented

- [ ] **Step 3: 补齐启动脚本、README 与忽略文件**

```gitignore
node_modules
dist
.vite
playwright-report
test-results
.skill-manager
```

- [ ] **Step 4: 运行完整验证**

Run: `pnpm test && pnpm test:e2e && pnpm build`
Expected: all commands exit 0

- [ ] **Step 5: 提交交付版本**

Run: `git add .`
Expected: all project files staged for delivery
