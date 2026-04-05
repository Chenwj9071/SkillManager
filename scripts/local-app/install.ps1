param(
  [string]$InstallDir = '',
  [switch]$SkipShortcuts
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
}

function Copy-DirectoryContents {
  param(
    [string]$Source,
    [string]$Destination
  )

  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Recurse -Force
  }
}

function Remove-InstalledAppPayload {
  param([string]$Root)

  $pathsToReset = @(
    (Join-Path $Root 'app'),
    (Join-Path $Root 'runtime'),
    (Join-Path $Root 'scripts'),
    (Join-Path $Root 'start-app.cmd'),
    (Join-Path $Root 'stop-app.cmd')
  )

  foreach ($path in $pathsToReset) {
    if (Test-Path $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
    }
  }
}

function New-Shortcut {
  param(
    [string]$ShortcutPath,
    [string]$TargetPath,
    [string]$WorkingDirectory
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $TargetPath
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.Save()
}

$bundleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Join-Path $bundleRoot 'package'

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
  $InstallDir = Join-Path $env:LOCALAPPDATA 'SkillsManager'
}

if (-not (Test-Path $packageRoot)) {
  throw "Package directory not found: $packageRoot"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$existingStopScript = Join-Path $InstallDir 'stop-app.cmd'
if (Test-Path $existingStopScript) {
  cmd /c $existingStopScript | Out-Null
}

Remove-InstalledAppPayload -Root $InstallDir
Copy-DirectoryContents -Source $packageRoot -Destination $InstallDir
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'data') | Out-Null

if (-not $SkipShortcuts) {
  $startMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Skills Manager'
  New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null

  New-Shortcut `
    -ShortcutPath (Join-Path $startMenuDir 'Skills Manager.lnk') `
    -TargetPath (Join-Path $InstallDir 'start-app.cmd') `
    -WorkingDirectory $InstallDir

  New-Shortcut `
    -ShortcutPath (Join-Path $startMenuDir 'Stop Skills Manager.lnk') `
    -TargetPath (Join-Path $InstallDir 'stop-app.cmd') `
    -WorkingDirectory $InstallDir
}

Write-Info ("Installed to {0}" -f ([System.IO.Path]::GetFullPath($InstallDir)))
Write-Info 'Use start-app.cmd to launch and stop-app.cmd to stop the local service.'
