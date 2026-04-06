$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
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
    return $false
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process) {
    return $false
  }

  Stop-Process -Id $ProcessId -Force
  Write-Info ("Stopped process {0} ({1})" -f $ProcessId, $process.ProcessName)
  return $true
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..'))
$runtimeDir = Join-Path $repoRoot '.skill-manager\runtime'
$pidFile = Join-Path $runtimeDir 'pids.json'
$serverEntry = Join-Path $repoRoot 'apps\api\dist\server.cjs'
$port = 3001
$stopped = $false

if (Test-Path $pidFile) {
  $pidRecord = Get-Content $pidFile -Raw | ConvertFrom-Json
  $serverPid = [int]$pidRecord.serverPid
  $stopped = (Stop-ManagedProcess -ProcessId $serverPid) -or $stopped
}

$listenerPid = Get-PortListenerProcessId -Port $port
if ((-not $stopped) -and $listenerPid -gt 0 -and (Test-IsManagedSkillManagerProcess -ProcessId $listenerPid -PathMarker $serverEntry)) {
  $stopped = (Stop-ManagedProcess -ProcessId $listenerPid) -or $stopped
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue

if (-not $stopped) {
  Write-Info 'No tracked background service was found.'
  exit 0
}
