$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
}

$port = 3001
$connections = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)

if ($connections.Count -eq 0) {
  Write-Info "No process is listening on port $port."
  exit 0
}

$connections | ForEach-Object {
  $processId = $_.OwningProcess
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $processId -Force
    Write-Info ("Stopped process {0} ({1}) on port {2}" -f $processId, $process.ProcessName, $port)
  }
}
