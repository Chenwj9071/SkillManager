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
$healthUrl = "http://{0}:{1}/api/health" -f $serverHost, $serverPort
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

function Test-HealthEndpoint {
  param(
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    if ($response.StatusCode -eq 200 -and $response.Content -match '"status"\s*:\s*"ok"') {
      return $true
    }
  }
  catch {
    return $false
  }
  return $false
}

function Wait-ForHealthEndpoint {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 30,
    [int]$ProcessId = 0
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-HealthEndpoint -Url $Url) {
      return $true
    }

    if ($ProcessId -gt 0) {
      $runningProcess = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
      if (-not $runningProcess) {
        return $false
      }
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Get-PortListenerProcessId {
  param([int]$Port)

  $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$"
  $matches = netstat -ano -p tcp | Select-String ":$Port"
  foreach ($match in $matches) {
    if ($match.Line -match $pattern) {
      return [int]$Matches[1]
    }
  }

  return 0
}

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  try {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
    return [string]$processInfo.CommandLine
  }
  catch {
    return ''
  }
}

function Test-IsManagedSkillManagerProcess {
  param(
    [int]$ProcessId,
    [string]$PathMarker
  )

  if ($ProcessId -le 0) {
    return $false
  }

  $commandLine = Get-ProcessCommandLine -ProcessId $ProcessId
  if (-not $commandLine) {
    return $false
  }

  return $commandLine.IndexOf($PathMarker, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Stop-ManagedProcess {
  param([int]$ProcessId)

  if ($ProcessId -le 0) {
    return
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $ProcessId -Force
  }
}

function Set-PidRecord {
  param([int]$ProcessId)

  @{
    serverPid = $ProcessId
    startedAt = (Get-Date).ToString('s')
    port = $serverPort
  } | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8
}

$nodeBinary = Assert-CommandExists -Name 'node' -Hint 'Node.js was not found. Install Node.js 24+ first.'
[void](Assert-CommandExists -Name 'corepack' -Hint 'corepack was not found. Install a Node.js version that includes corepack.')

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

$assetWriteTimeUtc = (
  @(
    (Get-Item $serverEntry).LastWriteTimeUtc,
    (Get-Item (Join-Path $webDistDir 'index.html')).LastWriteTimeUtc
  ) | Sort-Object -Descending | Select-Object -First 1
)

$listenerPid = Get-PortListenerProcessId -Port $serverPort
$trackedPid = 0
if (Test-Path $pidFile) {
  try {
    $trackedPid = [int]((Get-Content $pidFile -Raw | ConvertFrom-Json).serverPid)
  }
  catch {
    $trackedPid = 0
  }
}

if ($listenerPid -gt 0) {
  if (-not (Test-IsManagedSkillManagerProcess -ProcessId $listenerPid -PathMarker $serverEntry)) {
    throw "Port $serverPort is already in use by another process (PID $listenerPid). Stop that process before starting Skills Manager."
  }

  $listenerProcess = Get-Process -Id $listenerPid -ErrorAction SilentlyContinue
  $shouldRestart = $true
  if ($listenerProcess -and (Test-HealthEndpoint -Url $healthUrl)) {
    $shouldRestart =
      ($listenerProcess.StartTime.ToUniversalTime() -lt $assetWriteTimeUtc) -or
      ($trackedPid -ne $listenerPid)
  }

  if (-not $shouldRestart) {
    Set-PidRecord -ProcessId $listenerPid
    Write-Info "Skills Manager is already running at $healthUrl."
    if (-not $NoBrowser) {
      Start-Process ("http://{0}:{1}" -f $serverHost, $serverPort)
    }
    exit 0
  }

  Write-Info "Stopping stale Skills Manager process $listenerPid."
  Stop-ManagedProcess -ProcessId $listenerPid
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

@('', '') | Set-Content -Path $serverOutLog -Encoding UTF8
@('', '') | Set-Content -Path $serverErrLog -Encoding UTF8

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

Set-PidRecord -ProcessId $process.Id

if (-not (Wait-ForHealthEndpoint -Url $healthUrl -TimeoutSeconds 30 -ProcessId $process.Id)) {
  Write-Info 'Startup failed. The health endpoint did not become ready in time.'
  if (Test-Path $serverErrLog) {
    Get-Content $serverErrLog -Tail 40
  }
  exit 1
}

Write-Info ("Startup complete. Web: http://{0}:{1}" -f $serverHost, $serverPort)
if (-not $NoBrowser) {
  Start-Process ("http://{0}:{1}" -f $serverHost, $serverPort)
}
