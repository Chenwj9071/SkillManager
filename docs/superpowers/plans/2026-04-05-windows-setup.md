# Skills Manager Windows Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Skills Manager 增加 Windows `Setup.exe` 构建与本机安装验收能力。

**Architecture:** 复用现有 release 目录，使用 Inno Setup 进行二次封装；根命令先生成 release，再调用 `ISCC.exe` 编译安装器；最终安装器把 `package/` 内容部署到本机目录并创建快捷方式。

**Tech Stack:** Inno Setup, Node.js, PowerShell, CMD

---

### Task 1: 安装器脚本与构建入口

**Files:**
- Create: `installer/windows/skills-manager.iss`
- Create: `scripts/build-windows-installer.mjs`
- Modify: `package.json`

- [ ] 补 Inno Setup 脚本，引用 release 目录内容。
- [ ] 补 Node 构建脚本，负责定位 `ISCC.exe` 并执行编译。
- [ ] 在根 `package.json` 增加 `package:windows`。

### Task 2: 文档

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/specs/2026-04-05-windows-setup-design.md`
- Create: `docs/superpowers/plans/2026-04-05-windows-setup.md`

- [ ] 补设计文档。
- [ ] 补实现计划。
- [ ] 补 README 中 Windows 安装器构建与使用说明。

### Task 3: 真实构建与验收

**Files:**
- Output: `release/skills-manager-setup-win32-x64/Setup.exe`

- [ ] 安装 `Inno Setup`
- [ ] 运行 `corepack pnpm package:windows`
- [ ] 确认 `Setup.exe` 产出
- [ ] 运行安装器完成安装
- [ ] 验证安装后的启动和停止
