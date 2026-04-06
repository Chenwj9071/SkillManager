# Skills Manager

Local Web app for managing Claude, Codex, Cursor, and generic `SKILL.md` skill directories from one place.

## Features

- Detects default skill roots for Claude, Codex, Cursor, and `.agent`
- Supports custom directories
- Shows skills grouped and filtered by directory path
- Displays name, description, availability, symlink state, and source path
- Edits metadata and availability for Claude/Codex-compatible skills
- Supports batch availability updates
- Deletes skills
- Reuses a single skill or an entire skills root through symlinks
- Provides directory picker actions in the Web UI

## Install

```bash
corepack pnpm install
```

## Run In Development

```bash
corepack pnpm dev
```

Open:

- Web UI: `http://127.0.0.1:4173`
- API: `http://127.0.0.1:3001`

Windows quick start:

- Double-click `start-app.cmd`
- Stop with `stop-app.cmd`
- `start-app.cmd` builds the current workspace and starts a single background service on `http://127.0.0.1:3001`

Runtime logs are written to `.skill-manager/runtime/`.

## Local Package

Build a local packaged app directory:

```bash
corepack pnpm package:local
```

Output:

```text
release/skills-manager-local-<platform>-<arch>/
```

`release/` is a local build output directory and is ignored by Git.

Windows install flow:

1. Run `release/skills-manager-local-win32-x64/install.cmd`
2. Start the app from the installed `start-app.cmd`
3. Stop the app from the installed `stop-app.cmd`

You can also install to a custom directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\release\skills-manager-local-win32-x64\install.ps1 -InstallDir C:\SkillsManager
```

## Windows Setup.exe

Build the installer with Inno Setup:

```bash
corepack pnpm package:windows
```

Output:

```text
release/skills-manager-setup-win32-x64/SkillsManagerSetup.exe
```

Installer behavior:

1. Installs to `%LocalAppData%\SkillsManager` by default
2. Creates Start Menu shortcuts for `Skills Manager` and `Stop Skills Manager`
3. Creates a desktop shortcut for `Skills Manager`
4. Offers an optional `Run at login` startup shortcut
5. Launches the app after install if selected in the installer
6. Prompts whether to keep local `data/` during uninstall

If `ISCC.exe` is not on the default path:

```powershell
$env:INNO_SETUP_COMPILER='C:\Path\To\ISCC.exe'
corepack pnpm package:windows
```

## GitHub Manual Build

The repository includes a GitHub Actions workflow for manual Windows builds:

1. Open the repository on GitHub
2. Go to `Actions`
3. Choose `Manual Windows Build`
4. Click `Run workflow`
5. Wait for the run to finish, then download the generated artifacts

Artifacts uploaded by the workflow:

- `skills-manager-setup-win32-x64`
- `skills-manager-local-win32-x64`

## Verify

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```
