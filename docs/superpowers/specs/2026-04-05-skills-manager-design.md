# Skills Manager 设计文档

**日期：** 2026-04-05

## 1. 目标

构建一个跨平台、本地优先的 Skills 管理工具，通过浏览器 Web 界面统一管理 Claude、Codex 及兼容 `SKILL.md` 规范的 skills 目录。

核心目标：
- 自动检测主流 skills 目录，并支持用户添加自定义目录
- 统一展示不同工具下的 skills 列表、功能描述、状态和异常
- 支持删除技能、调整技能触发方式与元数据
- 支持通过软链接复用单个 skill 或整个 skills 目录
- 以本地 Web App 形式提供完整可视化管理能力

## 2. 非目标

以下内容不纳入 v1：
- 远程多机管理
- 在线 marketplace、在线安装源同步
- Git 同步、版本对比和审批流
- 对非 `SKILL.md` 结构的 agent 扩展格式做完整编辑支持

## 3. 用户与场景

目标用户是单机本地使用多个 AI 工具的开发者，典型场景包括：
- 查看本机有哪些 skills 分散在不同工具目录中
- 统一检查某个 skill 是否启用、是否只能手动触发、是否来自软链接
- 将一个工具目录里的 skill 复用到另一个工具目录
- 对 skill 元数据做轻量编辑，而不手工修改 YAML/frontmatter

## 4. 调研结论

### 4.1 Claude Code

Claude Code 官方 skills 文档说明：
- skills 以目录形式存在，目录内至少包含 `SKILL.md`
- 常见位置为项目级和用户级 `.claude/skills`
- `SKILL.md` frontmatter 支持 `name`、`description`、`disable-model-invocation`、`user-invocable`、`allowed-tools`、`context`、`agent`、`paths` 等字段

### 4.2 Codex

Codex 官方文档说明：
- skills 可位于项目、父目录、仓库根目录、用户目录下的 `.agents/skills`
- 支持 symlink 的 skill 目录
- 可通过 `agents/openai.yaml` 提供 UI 与策略配置，其中 `policy.allow_implicit_invocation` 影响自动触发能力

### 4.3 开放规范

Agent Skills 规范说明：
- skill 目录至少包含 `SKILL.md`
- 最小标准 frontmatter 为 `name` 和 `description`
- 允许扩展 metadata

### 4.4 开源方案空白

现有开源项目更偏“安装、分发、校验、市场”，缺少“多目录发现 + 统一编辑 + 本地 symlink 复用 + Web 管理台”的一体化产品。因此本项目的核心价值是构建一个本地统一管理层，而不是再做一个技能市场。

## 5. 架构决策

### 5.1 候选方案

方案 A：纯文件系统直连
- 直接扫描目录并实时读写文件
- 实现直接，但后续做筛选、日志和复杂预览时可维护性较差

方案 B：纯数据库镜像
- 先导入数据库，再异步回写磁盘
- 查询体验好，但容易和真实文件产生漂移

方案 C：混合架构，推荐
- 文件系统是真实来源
- SQLite 只做索引缓存、日志和任务状态
- 所有变更统一通过 service 写回磁盘并刷新索引

### 5.2 最终选择

采用方案 C。

原因：
- 技能文件天然就是事实来源，适合本地工具链场景
- UI 需要快速检索与分组统计，SQLite 作为索引层很有价值
- 兼顾一致性与可扩展性，后续增加日志、冲突分析和批量操作更自然

## 6. 技术选型

### 6.1 前端

- React
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS

### 6.2 后端

- Node.js
- TypeScript
- Fastify
- Zod
- SQLite
- `yaml`
- `chokidar`

### 6.3 选型理由

- 前后端都用 TypeScript，领域模型可共享
- Fastify 适合本地 API 服务，启动快、依赖轻
- SQLite 适合单机本地应用，不引入额外服务依赖
- `chokidar` 可用于目录变更监听，提升 UI 实时性

## 7. 核心领域模型

### 7.1 SkillSource

字段：
- `id`
- `toolType`: `claude | codex | generic`
- `rootPath`
- `scope`: `project | user | custom`
- `isDefault`
- `exists`
- `isSymlink`
- `symlinkTarget`

### 7.2 NormalizedSkill

字段：
- `id`
- `name`
- `description`
- `toolType`
- `rootPath`
- `skillPath`
- `slug`
- `exists`
- `isSymlink`
- `symlinkTarget`
- `broken`
- `lastModifiedAt`
- `availabilityMode`
- `warnings`
- `frontmatter`
- `codexConfig`

### 7.3 AvailabilityMode

统一展示层状态：
- `automatic`
- `manual_only`
- `hidden`
- `disabled`
- `unknown`

映射规则：
- Claude `disable-model-invocation: true` => `manual_only`
- Claude `user-invocable: false` 且可隐式调用 => 视为 `hidden`
- Codex `policy.allow_implicit_invocation: false` => `manual_only`
- 文件缺失、symlink 断裂或解析失败 => `disabled`

## 8. 目录发现策略

### 8.1 默认目录

按工具内置以下候选目录：

Claude：
- `~/.claude/skills`
- `<project>/.claude/skills`

Codex：
- `~/.agents/skills`
- `<project>/.agents/skills`
- 兼容别名 `<project>/.agent/skills`

### 8.2 自定义目录

用户可手工添加任意目录，并声明其工具类型：
- Claude
- Codex
- Generic
- Auto Detect

### 8.3 发现规则

- 扫描每个 root 下的一级子目录
- 若子目录包含 `SKILL.md`，则视为一个 skill
- 若 root 自身是指向另一个 skills 根目录的 symlink，也需要识别
- 若 skill 目录是 symlink，也需要记录目标信息
- 扫描时避免符号链接循环

## 9. 解析与兼容策略

### 9.1 通用解析

- 读取 `SKILL.md`
- 解析 YAML frontmatter
- 提取正文简介摘要

### 9.2 Claude 适配

识别并支持编辑：
- `name`
- `description`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools`
- `context`
- `agent`
- `paths`

### 9.3 Codex 适配

如果存在 `agents/openai.yaml`，额外读取：
- `interface`
- `policy.allow_implicit_invocation`
- `dependencies`

写回规则：
- 通用字段继续存于 `SKILL.md`
- Codex 策略字段优先落于 `agents/openai.yaml`

## 10. 功能设计

### 10.1 目录管理

支持：
- 查看默认目录与自定义目录
- 添加目录
- 删除自定义目录
- 测试目录有效性
- 触发重新扫描

### 10.2 Skills 列表

按工具目录分类展示：
- Skill 名称
- 功能描述
- 工具类型
- 所属目录
- 状态
- 是否为软链接
- 告警信息

支持：
- 关键词搜索
- 按目录筛选
- 按工具筛选
- 按状态筛选

### 10.3 Skill 详情与编辑

支持：
- 查看文件路径与来源目录
- 查看 `SKILL.md` frontmatter
- 查看 `agents/openai.yaml`
- 修改通用元数据
- 修改可用性/触发策略
- 预览原始文件内容

### 10.4 删除技能

规则：
- 普通目录：删除 skill 根目录
- symlink skill：默认仅删除链接本身，不删除源 skill
- 操作前必须展示影响路径与确认信息

### 10.5 软链接复用

支持两种复用：
- 将单个 skill 链接到另一个工具目录
- 将整个 skills 根目录链接到另一个目标位置

前置校验：
- 目标路径不存在
- 不产生循环引用
- 源目录存在
- 目标父目录可写

跨平台处理：
- Windows 优先目录 symlink，不可用时回退 junction
- macOS/Linux 使用 symbolic link

## 11. Web 界面设计

### 11.1 页面结构

页面包括：
- 仪表盘
- Skills 列表页
- Skill 详情页
- 目录管理页
- 复用向导页
- 操作日志页

### 11.2 布局

左侧是按工具分组的目录树，右侧为内容区。

内容区：
- 顶部提供搜索与筛选
- 中间为技能表格或卡片
- 详情页分为概览、元数据、原始文件、危险操作几个分区

## 12. 后端模块划分

### 12.1 `directory-registry`

职责：
- 管理默认目录
- 管理自定义目录配置
- 输出待扫描根目录列表

### 12.2 `scanner`

职责：
- 遍历根目录
- 识别 skill 根目录
- 检测 symlink 状态
- 避免循环

### 12.3 `parser`

职责：
- 解析 `SKILL.md`
- 解析 `agents/openai.yaml`
- 生成统一模型

### 12.4 `repository`

职责：
- 读写 SQLite 索引
- 读写目录配置
- 记录操作日志

### 12.5 `service`

职责：
- 聚合扫描、解析、写回逻辑
- 提供 API 所需的业务用例

### 12.6 `watcher`

职责：
- 监听目录变化
- 通知刷新缓存或重建索引

## 13. API 设计

主要接口：
- `GET /api/health`
- `GET /api/directories`
- `POST /api/directories`
- `DELETE /api/directories/:id`
- `POST /api/scan`
- `GET /api/skills`
- `GET /api/skills/:id`
- `PATCH /api/skills/:id/availability`
- `PATCH /api/skills/:id/metadata`
- `DELETE /api/skills/:id`
- `POST /api/links/skill`
- `POST /api/links/root`
- `GET /api/logs`

## 14. 数据持久化

SQLite 只保存：
- 注册目录
- 扫描索引结果
- 操作日志

磁盘中的真实 skill 文件仍然是唯一事实来源。数据库损坏时可通过重新扫描恢复。

## 15. 错误处理

需要显式处理：
- 路径不存在
- 权限不足
- YAML 解析失败
- symlink 断裂
- 写回冲突
- 目标目录已存在
- 不支持的字段变更

UI 需要给出明确的人类可读错误，而不是仅返回原始异常。

## 16. 测试策略

### 16.1 单元测试

覆盖：
- frontmatter 解析
- Codex YAML 解析
- availability 映射
- symlink 检测
- 路径归类与目录发现

### 16.2 集成测试

覆盖：
- API 的目录管理
- 技能扫描
- 元数据修改
- 删除技能
- 创建软链接

### 16.3 端到端测试

覆盖：
- 页面加载
- 目录添加
- 列表展示
- 编辑技能状态
- 删除技能
- 创建复用链接

## 17. 安全与边界

本工具是本地单机应用，不引入认证系统。但仍需限制：
- 所有文件操作必须在用户明确添加或默认识别的目录范围内进行
- 删除和链接操作必须先做路径解析与边界校验
- API 不执行任意 shell 命令

## 18. 里程碑

### 里程碑 1：项目骨架

- 初始化前后端工程
- 建立共享类型与 API 基础
- 搭建基础页面框架

### 里程碑 2：核心扫描与展示

- 目录注册
- skills 扫描
- 列表展示
- 详情展示

### 里程碑 3：编辑与删除

- 修改 availability
- 修改元数据
- 删除 skill

### 里程碑 4：复用能力

- skill 级 symlink
- 根目录级 symlink
- 冲突预检

### 里程碑 5：验证与交付

- 自动化测试
- 浏览器验证
- 使用说明

## 19. 风险与缓解

风险：
- 不同工具元数据格式差异较大
- symlink 在 Windows 上权限行为复杂
- 用户目录结构可能不规范

缓解：
- 统一归一化模型并保留原始字段
- 将链接创建逻辑独立成平台适配层
- 对扫描、写回和删除都做显式预检与错误提示

## 20. 最终结论

本项目应实现为“本地 Web 管理台 + 文件系统真相源 + SQLite 索引层”的跨平台工具。

这个设计能在 v1 内满足用户要求，并为后续扩展 marketplace、批量操作、变更对比和更多 agent 格式兼容预留空间。
