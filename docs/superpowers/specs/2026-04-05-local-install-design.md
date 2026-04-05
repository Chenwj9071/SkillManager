# Skills Manager 本地安装版设计

**日期：** 2026-04-05

## 目标

在保留当前本地 Web App 架构的前提下，将项目升级为可打包、可安装、可启动、可停止的本地安装版。

## 范围

本次只覆盖单机本地安装能力：

- 生产环境下由 API 直接托管 Web 静态资源
- 生成本地发布产物目录
- 发布产物内置 Node 运行时
- 提供安装、启动、停止脚本
- 默认安装到用户本机目录

暂不覆盖：

- 系统服务注册
- 开机自启
- 自动升级
- 真正的 `msi` / `dmg` / `pkg` 安装器

## 架构决策

### 1. 单进程生产模式

开发模式仍然保留前后端双进程：

- API：`tsx`
- Web：`vite dev`

本地安装版改为单进程：

- Node 启动生产 API
- API 托管 `apps/web/dist`
- 浏览器访问 `http://127.0.0.1:3001`

这样可以减少安装后的进程数量，降低端口协调和启停复杂度。

### 2. 发布产物自带 Node

发布目录直接复制构建机当前的 Node 可执行文件，避免安装后再要求用户额外安装 Node 或 pnpm。

### 3. 安装目录结构

安装后的目录结构如下：

```text
SkillsManager/
  app/
    api/
      server.cjs
    web/
      index.html
      assets/
  runtime/
    node.exe | node
  scripts/
    start-app.ps1
    stop-app.ps1
  data/
    skill-manager.db
    runtime/
      server.out.log
      server.err.log
  start-app.cmd
  stop-app.cmd
```

## 启停流程

### 安装

- 用户执行 release 目录下的 `install.cmd`
- 安装脚本将 `package/` 内容复制到目标目录
- 升级安装时保留 `data/`
- 可选创建开始菜单快捷方式

### 启动

- 用户执行安装目录内的 `start-app.cmd`
- 脚本检查 `3001` 端口
- 若未启动，则设置运行环境变量并启动 bundled Node
- 等待端口就绪后打开浏览器

### 停止

- 用户执行安装目录内的 `stop-app.cmd`
- 脚本停止监听 `3001` 的本地进程

## 交付产物

发布脚本输出：

- `release/skills-manager-local-<platform>-<arch>/`

目录内包含：

- `install.cmd`
- `install.ps1`
- `package/`
- `README.md`
- `manifest.json`

## 验证要求

- API 单元测试通过
- 生产打包成功
- 本地发布目录生成成功
- 使用发布目录安装到独立路径成功
- 使用安装后的 `start-app.cmd` 能启动并返回 HTTP 200
- 使用安装后的 `stop-app.cmd` 能停止服务
