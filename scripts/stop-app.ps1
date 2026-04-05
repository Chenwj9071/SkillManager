$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..'))
$runtimeDir = Join-Path $repoRoot '.skill-manager\runtime'
$pidFile = Join-Path $runtimeDir 'pids.json'

if (-not (Test-Path $pidFile)) {
  Write-Info 'No tracked background service was found.'
  exit 0
}

$pidRecord = Get-Content $pidFile -Raw | ConvertFrom-Json
$serverPid = [int]$pidRecord.serverPid
$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue

if (-not $process) {
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Info "No running process was found for pid $serverPid."
  exit 0
}

Stop-Process -Id $serverPid -Force
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Info ("Stopped process {0} ({1})" -f $serverPid, $process.ProcessName)
