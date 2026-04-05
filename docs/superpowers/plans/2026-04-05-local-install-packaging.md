# Skills Manager Local Install Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Skills Manager 增加本地安装版构建、安装与启停能力。

**Architecture:** 生产环境使用单进程 Node API 托管前端静态资源；发布脚本输出带有运行时和安装脚本的 release 目录；安装后通过脚本启动和停止本地服务。

**Tech Stack:** Fastify, React, Vite, esbuild, PowerShell, CMD

---

### Task 1: 生产运行时入口

**Files:**
- Create: `apps/api/src/lib/server-config.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/src/lib/server-config.test.ts`
- Test: `apps/api/src/app.test.ts`

- [ ] 写失败测试，覆盖生产配置读取和静态资源托管。
- [ ] 运行测试，确认新用例在实现前失败。
- [ ] 实现 `getServerConfig` 和静态文件托管逻辑。
- [ ] 重新运行 API 相关测试，确认通过。

### Task 2: 生产构建与发布产物

**Files:**
- Modify: `apps/api/package.json`
- Modify: `package.json`
- Create: `scripts/package-local.mjs`

- [ ] 将 API 构建改为单文件产物。
- [ ] 增加根级 `package:local` 发布命令。
- [ ] 编写 release staging 脚本，复制 API、Web、Node 运行时与脚本模板。
- [ ] 运行 `corepack pnpm package:local`，确认 release 目录生成。

### Task 3: 安装与启停脚本

**Files:**
- Create: `scripts/local-app/install.ps1`
- Create: `scripts/local-app/install.cmd`
- Create: `scripts/local-app/start-app.ps1`
- Create: `scripts/local-app/start-app.cmd`
- Create: `scripts/local-app/stop-app.ps1`
- Create: `scripts/local-app/stop-app.cmd`

- [ ] 编写安装脚本，支持自定义安装目录。
- [ ] 编写启动脚本，设置生产运行环境并等待端口就绪。
- [ ] 编写停止脚本，关闭本地服务。
- [ ] 使用 release 目录安装到独立测试路径并完成启停验证。

### Task 4: 文档与交付说明

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/specs/2026-04-05-local-install-design.md`
- Create: `docs/superpowers/plans/2026-04-05-local-install-packaging.md`

- [ ] 补充本地安装版设计文档。
- [ ] 更新 README，说明打包、安装、启动和停止方式。
- [ ] 汇总最终验证结果和产物位置。
