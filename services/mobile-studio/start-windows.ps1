# ReplyHalo Mobile Studio • Physical Android on Windows
# Run in PowerShell from this folder AFTER installing Python 3.11+ and Android
# Platform Tools (adb.exe), and enabling USB debugging on YOUR Android.
# Never sends Google/Instagram/TikTok account passwords to ReplyHalo.
param(
  [string]$AdbPath = "adb",
  [string]$ContentFolder = "$PSScriptRoot\Content"
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "ReplyHalo Android USB bridge" -ForegroundColor Cyan
$adbCmd = Get-Command $AdbPath -ErrorAction SilentlyContinue
if (-not $adbCmd -and -not (Test-Path $AdbPath)) {
    Write-Host "ADB not found. Install Android SDK Platform Tools from developer.android.com/tools/releases/platform-tools and re-run." -ForegroundColor Red
    exit 1
}
$lines = & $AdbPath devices -l
$ready = @($lines | Select-String "^([^\s]+)\s+device(?:\s|$)")
if ($ready.Count -ne 1) {
    Write-Host ($lines -join "`n")
    Write-Host "Connect exactly one Android via USB, unlock it, enable Developer options > USB debugging, and approve the computer's RSA fingerprint ON THE PHONE." -ForegroundColor Yellow
    exit 2
}
$serial = $ready[0].Matches[0].Groups[1].Value
Write-Host "Authorized Android found: $serial"
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { throw "Python 3.11+ not installed" }
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    python -m venv .venv
}
& ".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Could not install Python dependencies" }
if (-not (Test-Path ".env")) {
    $tokenBytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($tokenBytes) } finally { $rng.Dispose() }
    $token = [Convert]::ToBase64String($tokenBytes).TrimEnd('=').Replace('+','-').Replace('/','_')
    @"
MOBILE_STUDIO_TOKEN=$token
MOBILE_STUDIO_WORKSPACE_ID=REPLACE_WITH_REPLYHALO_WORKSPACE_ID
"@ | Set-Content ".env" -Encoding ascii
    Write-Host "Created .env with strong random token. Set MOBILE_STUDIO_WORKSPACE_ID to your ReplyHalo workspace ID, then re-run." -ForegroundColor Yellow
    exit 3
}
Get-Content ".env" | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) { [Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process") }
  }
}
if ($env:MOBILE_STUDIO_WORKSPACE_ID -eq "REPLACE_WITH_REPLYHALO_WORKSPACE_ID" -or -not $env:MOBILE_STUDIO_WORKSPACE_ID) {
    Write-Host "Set MOBILE_STUDIO_WORKSPACE_ID in .env first (ReplyHalo workspace UUID / ID)." -ForegroundColor Yellow
    exit 4
}
New-Item -ItemType Directory -Path $ContentFolder -Force | Out-Null
$env:MOBILE_STUDIO_DEVICE_MODE = "physical"
$env:MOBILE_STUDIO_ADB_SERIAL = $serial
$env:MOBILE_STUDIO_ADB_PATH = $AdbPath
$env:MOBILE_STUDIO_CONTENT_DIR = $ContentFolder
$env:MOBILE_STUDIO_RUNS_DB = (Join-Path $PSScriptRoot "runs.sqlite3")
Write-Host "USB Android ready. Gateway binds ONLY to 127.0.0.1:8788." -ForegroundColor Green
Write-Host "Local health: http://127.0.0.1:8788/health"
Write-Host "Connect to ReplyHalo via Cloudflare Access protected tunnel (instructions in README-WINDOWS.md)."
& ".venv\Scripts\python.exe" -m uvicorn gateway:app --host 127.0.0.1 --port 8788
