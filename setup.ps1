param(
  [switch]$Frontend,
  [switch]$Run
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$venvPath = Join-Path $root "venv"
if (-not (Test-Path $venvPath)) {
  Write-Host "Creating virtual environment..."
  python -m venv $venvPath
}

$venvPython = Join-Path $venvPath "Scripts\python.exe"

Write-Host "Installing backend dependencies..."
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt

if ($Frontend) {
  $frontendPackage = Join-Path $root "frontend\package.json"
  if (Test-Path $frontendPackage) {
    Write-Host "Installing frontend dependencies..."
    Push-Location (Join-Path $root "frontend")
    npm install
    Pop-Location
  } elseif (Test-Path (Join-Path $root "package.json")) {
    Write-Host "Installing frontend dependencies (root)..."
    npm install
  }
}

Write-Host "Setup complete."
Write-Host "To run backend: .\venv\Scripts\python.exe -m uvicorn main:app --reload"
Write-Host "To run frontend: cd frontend; npm run dev"

if ($Run) {
  Write-Host "Starting backend and frontend..."
  $backendCommand = "& `"$venvPython`" -m uvicorn main:app --reload"
  Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $backendCommand | Out-Null

  $frontendPackage = Join-Path $root "frontend\package.json"
  if (Test-Path $frontendPackage) {
    $frontendCommand = "cd `"$($root)\frontend`"; npm run dev"
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null
  } elseif (Test-Path (Join-Path $root "package.json")) {
    $frontendCommand = "cd `"$root`"; npm run dev"
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null
  } else {
    Write-Host "Frontend package.json not found. Skipping frontend start."
  }
}
