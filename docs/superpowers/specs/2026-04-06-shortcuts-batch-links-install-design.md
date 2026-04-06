# Skills Manager 快捷操作、批量链接与安装版产品化设计

## 背景

当前产品已经具备：
- skills 扫描、目录管理、状态编辑、单技能链接、整目录链接
- 最近操作、日志导出、可撤销操作
- 本地安装版与 Windows `Setup.exe`

但仍有三个明显缺口：
- 详情页缺少高频文件操作入口，用户仍要手动去文件系统里找目录和配置文件
- 批量选择只支持批量改可用性，批量复用 skills 仍要逐个操作
- 安装版已经可用，但还缺少开机启动、卸载数据策略、品牌化信息这些基本产品能力

本轮目标是补齐这三个高频缺口，并且保持现有本地 Web App 架构不变。

## 目标

本轮交付：
- 详情页快捷操作：打开技能目录、打开 `SKILL.md`、打开 `agents/openai.yaml`
- 批量创建链接：对已选中的多个 skills 一次性创建链接到目标 `skills` 目录
- 安装版产品化增强：开机启动选项、卸载时是否保留数据、图标与版本信息

不在本轮范围：
- 自动升级
- 系统托盘
- 批量链接覆盖已有目标
- 批量删除技能
- 远程机器文件操作

## 方案选择

### 方案 A：最小增量

- 详情页加 3 个按钮
- 批量创建链接由前端循环调用单技能接口
- 安装器只补几个 Inno Setup 选项

优点：
- 开发快

缺点：
- 批量操作没有统一预检与结果汇总
- 前端会发多次请求，失败处理与日志不一致
- 安装版后续继续扩展时还要返工

### 方案 B：结构化增强，采用

- 详情页快捷操作走统一本地文件打开接口
- 批量创建链接新增独立后端接口，先预检再执行
- 安装器统一扩展当前 Inno Setup 方案

优点：
- 一次把交互、接口和安装流程打顺
- 继续沿用现有架构，改动可控
- 后续可以自然扩展到更多批量操作

缺点：
- 需要补 API、前端状态和安装脚本测试

## 详细设计

### 1. 详情页快捷操作

在技能详情区新增一个 `快捷操作` 卡片，提供：
- `打开技能目录`
- `打开 SKILL.md`
- `打开 Codex 配置`

行为规则：
- `打开技能目录`：总是尝试打开 `skill.skillPath`
- `打开 SKILL.md`：仅当 `<skillPath>/SKILL.md` 存在时启用
- `打开 Codex 配置`：仅当 `<skillPath>/agents/openai.yaml` 存在时启用

跨平台实现：
- Windows：`Start-Process`
- macOS：`open`
- Linux：`xdg-open`

后端新增统一接口：
- `POST /api/open`

请求体：
- `path`
- `kind`: `directory | file`

响应：
- `{ ok: true }`

错误处理：
- 路径不存在返回 `404`
- 无法打开返回 `500`，保留原始错误摘要

### 2. 批量创建链接

#### 交互

在现有批量工具条里新增第二组操作：
- 目标 `skills` 目录输入框
- `选择目录` 按钮
- `批量创建链接` 按钮

目标目录含义：
- 指向目标工具的 `skills` 根目录
- 对每个被选中的 skill，在目标目录下创建同名目录链接

#### 执行规则

输入为：
- `skillIds[]`
- `targetRootPath`

处理流程：
1. 校验输入不能为空
2. 逐个计算目标路径 `<targetRootPath>/<skillSlug 或目录名>`
3. 预检目标状态
4. 可创建的执行链接创建
5. 冲突的跳过
6. 返回汇总结果

#### 冲突策略

本轮默认策略是 `skip-on-conflict`：
- 目标已存在真实目录：跳过
- 目标已存在文件：跳过
- 目标已存在且指向其他链接：跳过
- 目标已存在且已指向相同源：记为 `already_linked`

返回结构：
- `created[]`
- `skipped[]`
- `failed[]`
- `summary`

最近操作日志：
- 每个成功创建的链接仍然写单条 `skill.linked`
- 额外再写一条批量汇总日志 `skill.linked.batch`

这样可以兼容现有撤销机制和 CSV 导出。

#### API

新增：
- `POST /api/links/skill/batch`

请求体：
- `skillIds: string[]`
- `targetRootPath: string`

响应：
- `skills`
- `results`

### 3. 安装版产品化

#### 3.1 开机启动选项

在 Inno Setup 安装向导中新增任务：
- `开机后自动启动 Skills Manager`

实现方式：
- 仅写入当前用户启动目录快捷方式
- 启动目标仍是安装目录下的 `start-app.cmd`
- 不做系统服务，不提权

这样能保持现有“后台 Node 服务 + 浏览器打开”的模型。

#### 3.2 卸载是否保留数据

当前数据目录保留是硬编码行为。本轮改成显式选择：
- 卸载时询问是否保留 `data/`

用户选择：
- 保留：删除程序文件，保留 `data/`
- 不保留：连同 `data/` 一起删除

数据范围包括：
- SQLite 数据库
- 运行日志
- 启动 pid 信息

#### 3.3 图标与版本信息

安装器和应用入口补品牌化资源：
- 安装器图标
- 开始菜单/桌面快捷方式图标
- 版本信息
- 发布者信息

资源来源：
- 若仓库已有图标资源则复用
- 若没有，本轮增加基础 `ico`

版本来源：
- 以根 `package.json` 版本为主
- 构建脚本把版本同步给 Inno Setup

## 受影响模块

前端：
- `apps/web/src/app.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/styles.css`
- `apps/web/src/app.test.tsx`

后端：
- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/lib/services/skill-service.ts`
- `apps/api/src/lib/filesystem.ts`
- 新增本地打开服务模块

共享类型：
- `packages/shared/src/api.ts`
- `packages/shared/src/domain.ts`

安装产物：
- `installer/windows/skills-manager.iss`
- `scripts/build-windows-installer.mjs`
- `scripts/package-local.mjs`
- `scripts/local-app/*`
- 可能新增图标资源文件

## 测试策略

单元/集成测试：
- 详情页快捷操作按钮显隐与请求参数
- 批量创建链接接口成功、冲突、部分成功
- 安装脚本中开机启动与卸载数据策略文本存在

构建验证：
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm package:windows`

运行验证：
- 启动后能从详情页打开目录和文件
- 批量选择多个技能后能成功创建链接并返回汇总
- 安装器安装时能看到开机启动选项
- 卸载时能看到保留数据选择

## 风险与约束

- `打开文件/目录` 是本地 OS 行为，自动化测试很难完整覆盖，需以接口测试和实际运行验证结合
- Windows 启动目录快捷方式与卸载逻辑需要谨慎，避免残留无效入口
- 批量链接必须避免“部分失败但 UI 误报全成功”的情况，因此结果汇总必须清晰展示
- 本轮不做覆盖模式，避免对已有真实目录造成风险
