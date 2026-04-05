$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info {
  param([string]$Message)
  Write-Host "[Skills Manager] $Message"
}

$ports = @(3001, 4173, 4174)
$stopped = @()

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $processId -Force
      $stopped += [PSCustomObject]@{
        Port = $port
        ProcessId = $processId
        Name = $process.ProcessName
      }
    }
  }
}

if ($stopped.Count -eq 0) {
  Write-Info 'No process is listening on ports 3001, 4173, or 4174.'
  exit 0
}

$stopped | Sort-Object Port, ProcessId | ForEach-Object {
  Write-Info ("Stopped process {1} ({2}) on port {0}" -f $_.Port, $_.ProcessId, $_.Name)
}
