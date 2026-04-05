# Skills Manager Path-Centric Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Skills Manager 从工具类型视角调整为路径视角，并补齐 Cursor 默认目录、整目录复用目录选择器与批量修改可用性。

**Architecture:** 后端扩展目录类型与批量可用性接口，并提供受控的本地目录选择 API；前端将目录展示和筛选改为路径优先，增加批量选择、批量修改和目录横向滚动能力。

**Tech Stack:** Fastify, React, TypeScript, Vitest, Playwright

---

### Task 1: 扩展目录类型与默认目录

**Files:**
- Modify: `packages/shared/src/domain.ts`
- Modify: `apps/api/src/lib/default-directories.ts`
- Test: `apps/api/src/lib/default-directories.test.ts`

- [ ] 扩展 `toolType`，加入 `cursor`
- [ ] 为默认目录增加 `~/.cursor/skills` 与 `<project>/.cursor/skills`
- [ ] 跑默认目录测试

### Task 2: 批量可用性与目录选择器 API

**Files:**
- Modify: `packages/shared/src/api.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/app.test.ts`
- Modify: `apps/api/src/lib/services/skill-service.ts`
- Modify: `apps/api/src/lib/services/skill-service.test.ts`
- Create: `apps/api/src/lib/directory-picker.ts`

- [ ] 增加批量修改可用性 schema 与 API
- [ ] 增加本地目录选择器服务与 API
- [ ] 跑服务层和 API 测试

### Task 3: 路径优先 UI 与整目录复用选择

**Files:**
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] 将工具筛选改为路径筛选
- [ ] 目录区域补横向滚动
- [ ] 整目录复用的源目录改成已检测目录下拉
- [ ] 目标路径增加目录选择按钮
- [ ] 显示 `Generic (通用 SKILL.md)` 说明

### Task 4: 批量操作 UI 与验证

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/app.test.tsx`
- Modify: `tests/e2e/skills-manager.spec.ts`

- [ ] 增加多选、全选和批量修改可用性
- [ ] 保证批量选择跟随路径筛选正常工作
- [ ] 跑单元测试、E2E 和浏览器验收
