$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$setup = Join-Path $root "setup.ps1"
if (-not (Test-Path $setup)) {
  Write-Host "setup.ps1 not found at $setup"
  exit 1
}

& $setup -Run -Frontend
