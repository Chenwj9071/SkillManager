# Skills Manager 快捷操作、批量链接与安装版产品化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为技能详情页补快捷文件操作，为批量选择补批量创建链接，并增强 Windows 安装版的基础产品能力。

**Architecture:** 继续沿用现有 `React + Fastify + 本地文件系统` 架构。详情页快捷操作与批量链接都通过后端统一执行本地文件系统能力；安装版继续基于现有 Inno Setup 产物增强，不引入新桌面壳。

**Tech Stack:** React, TypeScript, TanStack Query, Fastify, PowerShell, Inno Setup

---

### Task 1: 补共享 API 类型

**Files:**
- Modify: `packages/shared/src/api.ts`
- Modify: `packages/shared/src/domain.ts`

**Step 1: 定义快捷打开接口 schema**
- 增加 `openLocalPathInputSchema`
- 字段：`path`、`kind`

**Step 2: 定义批量创建链接接口 schema**
- 增加 `createSkillLinksBatchInputSchema`
- 字段：`skillIds[]`、`targetRootPath`

**Step 3: 定义批量结果响应类型**
- 增加 `created[]`、`skipped[]`、`failed[]`、`summary`

**Step 4: 运行共享类型相关测试**
- Run: `corepack pnpm exec vitest run packages/shared/src/domain.test.ts`

### Task 2: 实现后端本地打开能力

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/lib/open-local-path.ts`
- Modify: `apps/api/src/app.test.ts`

**Step 1: 写接口测试**
- 测 `POST /api/open`
- 覆盖：成功、路径不存在、非法参数

**Step 2: 实现跨平台本地打开模块**
- Windows 用 `Start-Process`
- macOS 用 `open`
- Linux 用 `xdg-open`

**Step 3: 接入 API 路由**
- 校验 schema
- 错误转为清晰消息

**Step 4: 跑接口测试**
- Run: `corepack pnpm exec vitest run apps/api/src/app.test.ts`

### Task 3: 实现后端批量创建链接

**Files:**
- Modify: `apps/api/src/lib/services/skill-service.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/app.test.ts`

**Step 1: 写批量链接接口失败测试**
- 冲突跳过
- 部分成功

**Step 2: 在 service 中实现批量预检与执行**
- 读取选中技能
- 计算目标路径
- 逐个创建/跳过
- 写单条 `skill.linked` 日志和批量汇总日志

**Step 3: 暴露 `/api/links/skill/batch`**

**Step 4: 跑后端测试**
- Run: `corepack pnpm exec vitest run apps/api/src/app.test.ts apps/api/src/lib/services/skill-service.test.ts`

### Task 4: 前端接入详情页快捷操作

**Files:**
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/app.test.tsx`

**Step 1: 写前端交互测试**
- 验证 3 个按钮请求参数
- 验证不存在的文件按钮禁用

**Step 2: 增加 API 封装**
- `openLocalPath`

**Step 3: 在详情页新增快捷操作卡片**
- 打开目录
- 打开 `SKILL.md`
- 打开 `agents/openai.yaml`

**Step 4: 跑前端测试**
- Run: `corepack pnpm exec vitest run apps/web/src/app.test.tsx apps/web/src/api.test.ts`

### Task 5: 前端接入批量创建链接

**Files:**
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/app.test.tsx`

**Step 1: 写批量链接交互测试**
- 已选多个 skill
- 选择目标目录
- 调用批量链接接口
- 显示汇总提示

**Step 2: 在批量工具条新增目标目录与按钮**

**Step 3: 复用目录选择器填充目标 `skills` 目录**

**Step 4: 显示结果汇总**
- 至少显示创建数量、跳过数量、失败数量

**Step 5: 跑前端测试**
- Run: `corepack pnpm exec vitest run apps/web/src/app.test.tsx`

### Task 6: 增强 Windows 安装器

**Files:**
- Modify: `installer/windows/skills-manager.iss`
- Modify: `scripts/build-windows-installer.mjs`
- Modify: `README.md`
- Modify: `apps/api/src/installer-script.test.ts`
- Possibly Create: `installer/windows/assets/*.ico`

**Step 1: 写安装器脚本测试**
- 验证开机启动 task
- 验证卸载保留数据逻辑文本
- 验证图标和版本字段

**Step 2: 在 Inno Setup 中增加开机启动选项**
- 写入当前用户启动目录快捷方式

**Step 3: 增加卸载时是否保留数据逻辑**

**Step 4: 注入图标与版本信息**
- 版本读取自根 `package.json`

**Step 5: 更新 README**
- 补安装行为和卸载行为说明

**Step 6: 跑安装器相关测试**
- Run: `corepack pnpm exec vitest run apps/api/src/installer-script.test.ts`

### Task 7: 全量验证

**Files:**
- No code changes expected

**Step 1: 运行完整测试**
- Run: `corepack pnpm test`

**Step 2: 运行构建**
- Run: `corepack pnpm build`

**Step 3: 打包 Windows 安装器**
- Run: `corepack pnpm package:windows`

**Step 4: 实机验证**
- 启动应用
- 验证详情页快捷操作
- 验证批量创建链接
- 验证安装器新选项

### Task 8: 提交与推送

**Files:**
- 所有本轮改动文件

**Step 1: 检查工作区**
- Run: `git status --short --branch`

**Step 2: 提交**
- Commit message 建议：`Add batch link creation and installer polish`

**Step 3: 推送**
- Run: `git push origin main`
