param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
}

function Assert-PathExists {
  param(
    [string]$Path,
    [string]$Hint
  )

  if (-not (Test-Path $Path)) {
    throw "$Hint`nMissing path: $Path"
  }
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

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..'))
$dataDir = Join-Path $appRoot 'data'
$runtimeDir = Join-Path $dataDir 'runtime'
$serverOutLog = Join-Path $runtimeDir 'server.out.log'
$serverErrLog = Join-Path $runtimeDir 'server.err.log'
$pidFile = Join-Path $runtimeDir 'pids.json'
$nodeBinary = Join-Path $appRoot 'runtime\node.exe'
$serverEntry = Join-Path $appRoot 'app\api\server.cjs'
$webDistDir = Join-Path $appRoot 'app\web'
$serverHost = '127.0.0.1'
$port = 3001
$healthUrl = "http://{0}:{1}/api/health" -f $serverHost, $port

if (-not (Test-Path $nodeBinary)) {
  $nodeBinary = Join-Path $appRoot 'runtime\node'
}

Assert-PathExists -Path $nodeBinary -Hint 'Bundled Node runtime was not found.'
Assert-PathExists -Path $serverEntry -Hint 'Production API bundle was not found.'
Assert-PathExists -Path $webDistDir -Hint 'Production web assets were not found.'

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (Test-HealthEndpoint -Url $healthUrl) {
  Write-Info "Skills Manager is already running at $healthUrl."
  if (-not $NoBrowser) {
    Start-Process ("http://{0}:{1}" -f $serverHost, $port)
  }
  exit 0
}

@('', '') | Set-Content -Path $serverOutLog -Encoding UTF8
@('', '') | Set-Content -Path $serverErrLog -Encoding UTF8

$previousValues = @{
  host = $env:SKILL_MANAGER_HOST
  port = $env:SKILL_MANAGER_PORT
  webDist = $env:SKILL_MANAGER_WEB_DIST
  dataDir = $env:SKILL_MANAGER_DATA_DIR
}

$env:SKILL_MANAGER_HOST = $serverHost
$env:SKILL_MANAGER_PORT = [string]$port
$env:SKILL_MANAGER_WEB_DIST = $webDistDir
$env:SKILL_MANAGER_DATA_DIR = $dataDir

try {
  $process = Start-Process `
    -FilePath $nodeBinary `
    -ArgumentList $serverEntry `
    -WorkingDirectory $appRoot `
    -RedirectStandardOutput $serverOutLog `
    -RedirectStandardError $serverErrLog `
    -WindowStyle Hidden `
    -PassThru
}
finally {
  $env:SKILL_MANAGER_HOST = $previousValues.host
  $env:SKILL_MANAGER_PORT = $previousValues.port
  $env:SKILL_MANAGER_WEB_DIST = $previousValues.webDist
  $env:SKILL_MANAGER_DATA_DIR = $previousValues.dataDir
}

@{
  serverPid = $process.Id
  startedAt = (Get-Date).ToString('s')
  port = $port
} | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

if (-not (Wait-ForHealthEndpoint -Url $healthUrl -TimeoutSeconds 30 -ProcessId $process.Id)) {
  Write-Info 'Startup failed. The health endpoint did not become ready in time.'
  if (Test-Path $serverErrLog) {
    Get-Content $serverErrLog -Tail 40
  }
  exit 1
}

Write-Info ("Startup complete. Web: http://{0}:{1}" -f $serverHost, $port)
if (-not $NoBrowser) {
  Start-Process ("http://{0}:{1}" -f $serverHost, $port)
}
