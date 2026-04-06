# Undo And Log Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为最近操作增加详情弹窗、可撤销回滚能力和 CSV 导出能力。

**Architecture:** 后端扩展活动日志模型和日志服务，基于操作前后快照判断是否允许撤销；前端在最近操作区域增加导出按钮和详情弹窗，并从后端获取实时撤销状态。撤销只覆盖已确认的 4 类操作。

**Tech Stack:** React, TanStack Query, Fastify, SQLite, Vitest, TypeScript

---

### Task 1: 扩展日志领域模型和 API

**Files:**
- Modify: `packages/shared/src/domain.ts`
- Modify: `packages/shared/src/api.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/app.test.ts`

- [ ] 定义日志详情、撤销状态和导出响应的共享类型
- [ ] 为日志详情、日志导出、日志撤销补充 API schema
- [ ] 在 API 层新增日志详情、导出、撤销接口
- [ ] 为新接口补充 API 测试

### Task 2: 扩展日志仓库和服务

**Files:**
- Modify: `apps/api/src/lib/repositories/log-repository.ts`
- Modify: `apps/api/src/lib/services/skill-service.ts`
- Test: `apps/api/src/lib/services/skill-service.test.ts`

- [ ] 日志仓库支持按 id 查询单条日志
- [ ] 日志仓库支持导出所需的批量读取
- [ ] 服务层为 4 类可撤销操作写入前后快照
- [ ] 服务层实现“当前状态是否仍等于 after 快照”的判定
- [ ] 服务层实现日志详情、日志撤销和 CSV 导出
- [ ] 为撤销成功和不可撤销场景补充测试

### Task 3: 实现文件系统回滚

**Files:**
- Modify: `apps/api/src/lib/services/skill-service.ts`
- Modify: `apps/api/src/lib/filesystem.ts`
- Test: `apps/api/src/lib/filesystem.test.ts`

- [ ] 可用性回滚写回原状态
- [ ] 元数据回滚写回原始结构化快照
- [ ] 单技能链接和整目录链接回滚时只删除当前仍匹配来源的链接
- [ ] 为“被后续修改覆盖后不可回滚”补测试

### Task 4: 前端日志交互

**Files:**
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/app.test.tsx`
- Test: `apps/web/src/api.test.ts`

- [ ] 前端 API 层支持获取日志详情、撤销日志、导出 CSV
- [ ] 最近操作区域新增“导出 CSV”按钮
- [ ] 点击日志打开详情弹窗
- [ ] 弹窗展示操作详情、撤销状态和原因
- [ ] 对可撤销日志显示撤销按钮
- [ ] 为双击、导出和撤销交互补测试

### Task 5: 验证

**Files:**
- Modify: `README.md`（如需补充说明）

- [ ] 运行日志和撤销相关 Vitest 测试
- [ ] 运行全量 `corepack pnpm test`
- [ ] 运行 `corepack pnpm build`
- [ ] 如界面结构有明显变化，补 `corepack pnpm test:e2e`
