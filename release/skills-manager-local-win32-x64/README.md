# Skills Manager

本地 Web App，用于统一管理 Claude、Codex 以及兼容 `SKILL.md` 规范的 skills 目录。

## 功能

- 自动发现默认 skills 目录
- 添加自定义目录
- 按工具分组展示 skills
- 修改技能名称、描述和可用性
- 删除技能
- 通过软链接复用单个 skill 或整个 skills 根目录
- 在浏览器中进行可视化管理

## 安装

```bash
corepack pnpm install
```

## 启动

开发模式启动：

```bash
corepack pnpm dev
```

Windows 一键启动：

- 双击 `start-app.cmd`
- 停止时双击 `stop-app.cmd`

脚本会启动本地 API 和 Web 服务，并默认打开浏览器。

启动后访问：

- 前端：`http://127.0.0.1:4173`
- 后端：`http://127.0.0.1:3001`

运行日志位于 `.skill-manager/runtime/`。

## 本地安装版

生成本地发布产物：

```bash
corepack pnpm package:local
```

打包完成后，产物位于：

```text
release/skills-manager-local-<platform>-<arch>/
```

Windows 安装与使用：

1. 运行 `release/skills-manager-local-win32-x64/install.cmd`
2. 安装完成后执行安装目录内的 `start-app.cmd`
3. 停止服务时执行安装目录内的 `stop-app.cmd`

测试或自定义安装目录时，也可以直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\release\skills-manager-local-win32-x64\install.ps1 -InstallDir C:\SkillsManager
```

安装版默认通过 `http://127.0.0.1:3001` 提供 Web 界面。

## Windows Setup.exe

先安装 `Inno Setup`，然后执行：

```bash
corepack pnpm package:windows
```

输出位置：

```text
release/skills-manager-setup-win32-x64/SkillsManagerSetup.exe
```

运行 `SkillsManagerSetup.exe` 后：

1. 安装目录默认是 `%LocalAppData%\SkillsManager`
2. 开始菜单会生成 `Skills Manager` 和 `Stop Skills Manager`
3. 桌面会默认生成 `Skills Manager` 快捷方式
4. 安装完成后可以直接启动应用

如果需要自定义 `ISCC.exe` 路径，可以设置环境变量：

```powershell
$env:INNO_SETUP_COMPILER='C:\Path\To\ISCC.exe'
corepack pnpm package:windows
```

## 测试

```bash
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```
