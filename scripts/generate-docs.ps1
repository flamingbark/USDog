# Ensure strict errors
$ErrorActionPreference = "Stop"

function Ensure-Doxygen {
  param(
    [string]$ToolsDir
  )

  if (-not (Test-Path $ToolsDir)) {
    New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
  }

  # Check if doxygen.exe already exists
  $exe = Get-ChildItem -Path $ToolsDir -Recurse -Filter "doxygen.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($exe) {
    return $exe.FullName
  }

  $zipUrl = "https://github.com/doxygen/doxygen/releases/download/Release_1_10_0/doxygen-1.10.0.windows.x64.bin.zip"
  $zipPath = Join-Path $ToolsDir "doxygen.zip"

  Write-Host "Downloading Doxygen from $zipUrl ..."
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

  Write-Host "Extracting Doxygen to $ToolsDir ..."
  Expand-Archive -Path $zipPath -DestinationPath $ToolsDir -Force

  # Attempt to find the exe after extraction
  $exe = Get-ChildItem -Path $ToolsDir -Recurse -Filter "doxygen.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $exe) {
    throw "doxygen.exe not found after extraction."
  }

  return $exe.FullName
}

# Resolve paths
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$toolsDir = Join-Path $repoRoot "tools\doxygen"
$doxyfile = Join-Path $repoRoot "Doxyfile"

if (-not (Test-Path $doxyfile)) {
  throw "Doxyfile not found at $doxyfile"
}

# Ensure doxygen and run
$doxygenExe = Ensure-Doxygen -ToolsDir $toolsDir
Write-Host "Using doxygen at: $doxygenExe"

Push-Location $repoRoot
try {
  & $doxygenExe $doxyfile
  if ($LASTEXITCODE -ne 0) {
    throw "Doxygen exited with code $LASTEXITCODE"
  }
  Write-Host "Doxygen documentation generated at frontendnew/public/doxygen/html/index.html"
} finally {
  Pop-Location
}