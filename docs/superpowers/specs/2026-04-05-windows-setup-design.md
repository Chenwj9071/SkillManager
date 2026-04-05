# Skills Manager Windows Setup 设计

**日期：** 2026-04-05

## 目标

将当前已经可用的本地 release 目录进一步封装为 Windows `Setup.exe`，让用户通过标准安装器完成安装、卸载和开始菜单入口创建。

## 范围

本次只覆盖 Windows：

- 安装 `Inno Setup`
- 生成 `.iss` 安装器脚本
- 增加一键构建 `Setup.exe` 的命令
- 在本机编译出实际安装器
- 执行安装器并验证安装后的启动与停止

暂不覆盖：

- 代码签名
- 自动升级
- 多语言安装界面
- macOS / Linux 原生安装器

## 方案对比

### 方案 A：继续只发脚本式 release 目录

- 优点：当前已经能用，改动最少
- 缺点：分发体验差，不像正式 Windows 软件

### 方案 B：使用 Inno Setup，推荐

- 优点：成熟、轻量、脚本简单，适合把现有目录直接封装成 `Setup.exe`
- 优点：支持安装目录、开始菜单、卸载程序、安装后启动
- 缺点：Windows 专用

### 方案 C：使用 WiX

- 优点：更企业级，适合做 MSI
- 缺点：配置更重，本项目当前需求不值当

## 最终决策

采用 `Inno Setup`。

封装方式：

1. 先执行现有 `package:local`
2. 确保 release 目录完整
3. 使用 `.iss` 脚本把 release 里的 `package/` 内容安装到 `%LocalAppData%\SkillsManager`
4. 在开始菜单创建：
   - `Skills Manager`
   - `Stop Skills Manager`
   - `Uninstall Skills Manager`

## 安装行为

- 安装目标目录默认为 `{localappdata}\SkillsManager`
- 安装时覆盖程序文件，但保留 `data/`
- 安装完成后可选立即启动 `start-app.cmd`
- 卸载时删除程序文件；`data/` 是否保留由安装器脚本显式控制

## 需要新增的工程项

- `installer/windows/skills-manager.iss`
- `scripts/build-windows-installer.mjs`
- `package.json` 中的 `package:windows`
- README 中的 Windows 安装器说明

## 验证标准

- `winget` 成功安装 `Inno Setup`
- `ISCC.exe` 可调用
- `corepack pnpm package:windows` 成功产出 `Setup.exe`
- 运行 `Setup.exe` 完成安装
- 安装后的 `start-app.cmd` 可启动
- 安装后的 `stop-app.cmd` 可停止
