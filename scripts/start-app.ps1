param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..'))
$runtimeDir = Join-Path $repoRoot '.skill-manager\runtime'
$buildLog = Join-Path $runtimeDir 'build.log'
$serverOutLog = Join-Path $runtimeDir 'server.out.log'
$serverErrLog = Join-Path $runtimeDir 'server.err.log'
$pidFile = Join-Path $runtimeDir 'pids.json'
$serverHost = '127.0.0.1'
$serverPort = 3001
$serverEntry = Join-Path $repoRoot 'apps\api\dist\server.cjs'
$webDistDir = Join-Path $repoRoot 'apps\web\dist'

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
}

function Assert-CommandExists {
  param(
    [string]$Name,
    [string]$Hint
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw $Hint
  }

  return $command.Source
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

$nodeBinary = Assert-CommandExists -Name 'node' -Hint 'Node.js was not found. Install Node.js 24+ first.'
[void](Assert-CommandExists -Name 'corepack' -Hint 'corepack was not found. Install a Node.js version that includes corepack.')

$existing = @(Get-NetTCPConnection -LocalPort $serverPort -State Listen -ErrorAction SilentlyContinue)
if ($existing.Count -gt 0) {
  Write-Info "Port $serverPort is already in use."
  if (-not $NoBrowser) {
    Start-Process ("http://{0}:{1}" -f $serverHost, $serverPort)
  }
  exit 0
}

Write-Info 'Building production assets...'
try {
  & corepack pnpm build *> $buildLog
}
catch {
  Write-Info 'Build failed. Recent output:'
  if (Test-Path $buildLog) {
    Get-Content $buildLog -Tail 60
  }
  throw
}

if (-not (Test-Path $serverEntry)) {
  throw "Production API bundle was not found after build.`nMissing path: $serverEntry"
}

if (-not (Test-Path $webDistDir)) {
  throw "Production web assets were not found after build.`nMissing path: $webDistDir"
}

$previousValues = @{
  host = $env:SKILL_MANAGER_HOST
  port = $env:SKILL_MANAGER_PORT
  webDist = $env:SKILL_MANAGER_WEB_DIST
}

$env:SKILL_MANAGER_HOST = $serverHost
$env:SKILL_MANAGER_PORT = [string]$serverPort
$env:SKILL_MANAGER_WEB_DIST = $webDistDir

try {
  $process = Start-Process `
    -FilePath $nodeBinary `
    -ArgumentList $serverEntry `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $serverOutLog `
    -RedirectStandardError $serverErrLog `
    -WindowStyle Hidden `
    -PassThru
}
finally {
  $env:SKILL_MANAGER_HOST = $previousValues.host
  $env:SKILL_MANAGER_PORT = $previousValues.port
  $env:SKILL_MANAGER_WEB_DIST = $previousValues.webDist
}

@{
  serverPid = $process.Id
  startedAt = (Get-Date).ToString('s')
  port = $serverPort
} | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

if (-not (Wait-ForPort -Port $serverPort -TimeoutSeconds 30)) {
  Write-Info 'Startup failed. The server port did not become ready in time.'
  if (Test-Path $serverErrLog) {
    Get-Content $serverErrLog -Tail 40
  }
  exit 1
}

Write-Info ("Startup complete. Web: http://{0}:{1}" -f $serverHost, $serverPort)
if (-not $NoBrowser) {
  Start-Process ("http://{0}:{1}" -f $serverHost, $serverPort)
}
